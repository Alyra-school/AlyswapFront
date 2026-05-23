"use client";

import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, factoryAbi, routerAbi } from "@/contracts/abis";
import { getContractsByChain } from "@/lib/contracts";
import { CreatePairForm } from "@/components/create-pair-form";
import { useToast } from "@/components/toast-provider";
import { addActivity } from "@/lib/activity";
import { toUserErrorMessage } from "@/lib/tx-errors";

const pairAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" }
    ]
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

type PairView = {
  tokenA: { symbol: string; address: `0x${string}`; decimals: number };
  tokenB: { symbol: string; address: `0x${string}`; decimals: number };
  pairAddress: `0x${string}`;
  reserveA: bigint;
  reserveB: bigint;
  tvlScore: number;
  lpBalance: bigint;
  totalSupply: bigint;
};

export function PoolExplorer() {
  const { chainId, address } = useAccount();
  const { deployment, factory, router } = getContractsByChain(chainId);
  const { pushToast } = useToast();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [selectedPair, setSelectedPair] = useState<PairView | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [amountA, setAmountA] = useState("10");
  const [amountB, setAmountB] = useState("10");
  const [lpToRemove, setLpToRemove] = useState("1");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const tokenPairs = useMemo(() => {
    const out: Array<{ tokenA: (typeof deployment.tokens)[number]; tokenB: (typeof deployment.tokens)[number] }> = [];
    for (let i = 0; i < deployment.tokens.length; i += 1) {
      for (let j = i + 1; j < deployment.tokens.length; j += 1) {
        out.push({ tokenA: deployment.tokens[i], tokenB: deployment.tokens[j] });
      }
    }
    return out;
  }, [deployment.tokens]);

  const pairAddressReads = useReadContracts({
    contracts: tokenPairs.map((p) => ({
      abi: factoryAbi,
      address: factory.address,
      functionName: "getPair" as const,
      args: [p.tokenA.address, p.tokenB.address]
    })),
    query: { enabled: tokenPairs.length > 0 }
  });

  const existingPairs = useMemo(() => {
    return tokenPairs
      .map((p, idx) => {
        const pairAddress = pairAddressReads.data?.[idx]?.result as `0x${string}` | undefined;
        return { ...p, pairAddress };
      })
      .filter((p) => p.pairAddress && p.pairAddress !== "0x0000000000000000000000000000000000000000") as Array<
      {
        tokenA: (typeof deployment.tokens)[number];
        tokenB: (typeof deployment.tokens)[number];
        pairAddress: `0x${string}`;
      }
    >;
  }, [tokenPairs, pairAddressReads.data, deployment.tokens]);

  const pairMetaReads = useReadContracts({
    contracts: existingPairs.flatMap((p) => {
      const contracts: Array<any> = [
        { abi: pairAbi, address: p.pairAddress, functionName: "getReserves" as const },
        { abi: pairAbi, address: p.pairAddress, functionName: "token0" as const },
        { abi: pairAbi, address: p.pairAddress, functionName: "totalSupply" as const }
      ];
      if (address) {
        contracts.push({ abi: pairAbi, address: p.pairAddress, functionName: "balanceOf" as const, args: [address as `0x${string}`] });
      }
      return contracts;
    }),
    query: { enabled: existingPairs.length > 0 }
  });

  const pairs = useMemo<PairView[]>(() => {
    if (!pairMetaReads.data) return [];
    const step = address ? 4 : 3;
    const result: PairView[] = [];
    for (let i = 0; i < existingPairs.length; i += 1) {
      const p = existingPairs[i];
        const base = i * step;
        const reserves = pairMetaReads.data?.[base]?.result as readonly [bigint, bigint, number] | undefined;
        const token0 = (pairMetaReads.data?.[base + 1]?.result as `0x${string}` | undefined)?.toLowerCase();
        const totalSupply = (pairMetaReads.data?.[base + 2]?.result as bigint | undefined) ?? 0n;
        const lpBalance = address ? ((pairMetaReads.data?.[base + 3]?.result as bigint | undefined) ?? 0n) : 0n;
        if (!reserves || !token0) continue;

        const isToken0A = p.tokenA.address.toLowerCase() === token0;
        const reserveA = isToken0A ? reserves[0] : reserves[1];
        const reserveB = isToken0A ? reserves[1] : reserves[0];

        const tvlScore = Number(formatUnits(reserveA, p.tokenA.decimals)) + Number(formatUnits(reserveB, p.tokenB.decimals));

        result.push({
          tokenA: p.tokenA,
          tokenB: p.tokenB,
          pairAddress: p.pairAddress,
          reserveA,
          reserveB,
          tvlScore,
          lpBalance,
          totalSupply
        });
      }
    return result.sort((a, b) => b.tvlScore - a.tvlScore);
  }, [pairMetaReads.data, existingPairs, address]);

  const addLiquidity = async () => {
    if (!selectedPair || !publicClient || !address) return;
    try {
      setError("");
      setStatus("approving");
      const aWei = parseUnits(amountA, selectedPair.tokenA.decimals);
      const bWei = parseUnits(amountB, selectedPair.tokenB.decimals);

      const tx1 = await writeContractAsync({ abi: erc20Abi, address: selectedPair.tokenA.address, functionName: "approve", args: [router.address, aWei] });
      await publicClient.waitForTransactionReceipt({ hash: tx1 });
      const tx2 = await writeContractAsync({ abi: erc20Abi, address: selectedPair.tokenB.address, functionName: "approve", args: [router.address, bWei] });
      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      setStatus("adding");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const tx3 = await writeContractAsync({
        abi: routerAbi,
        address: router.address,
        functionName: "addLiquidity",
        args: [selectedPair.tokenA.address, selectedPair.tokenB.address, aWei, bWei, 0n, 0n, address as `0x${string}`, deadline]
      });
      await publicClient.waitForTransactionReceipt({ hash: tx3 });
      setStatus("success");
      pushToast("Liquidity added", "success");
      addActivity("Pool", `Add ${amountA}/${amountB} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "success");
    } catch (e) {
      setStatus("error");
      const m = toUserErrorMessage(e, "Add liquidity failed");
      setError(m);
      pushToast(m, "error");
    }
  };

  const removeLiquidity = async () => {
    if (!selectedPair || !publicClient || !address) return;
    try {
      setError("");
      setStatus("removing");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const tx = await writeContractAsync({
        abi: routerAbi,
        address: router.address,
        functionName: "removeLiquidity",
        args: [
          selectedPair.tokenA.address,
          selectedPair.tokenB.address,
          parseUnits(lpToRemove, 18),
          0n,
          0n,
          address as `0x${string}`,
          deadline
        ]
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setStatus("success");
      pushToast("Liquidity removed", "success");
      addActivity("Pool", `Remove LP ${lpToRemove} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "success");
    } catch (e) {
      setStatus("error");
      const m = toUserErrorMessage(e, "Remove liquidity failed");
      setError(m);
      pushToast(m, "error");
    }
  };

  return (
    <div className="stack">
      <section className="pool-cards-grid">
        <button className="pool-card pool-card-create" onClick={() => setOpenCreate(true)}>
          <h3>Create Pool</h3>
          <p>Initialiser une nouvelle paire sur le protocole</p>
        </button>

        {pairs.map((pair) => {
          const positionPct = pair.totalSupply > 0n ? (Number(pair.lpBalance) / Number(pair.totalSupply)) * 100 : 0;
          return (
            <button key={pair.pairAddress} className="pool-card" onClick={() => setSelectedPair(pair)}>
              <h3>{pair.tokenA.symbol}/{pair.tokenB.symbol}</h3>
              <p>TVL: {pair.tvlScore.toFixed(4)}</p>
              {positionPct > 0 ? <p>Your position: {positionPct.toFixed(4)}%</p> : null}
            </button>
          );
        })}
      </section>

      {openCreate ? (
        <div className="pool-modal-backdrop" onClick={() => setOpenCreate(false)}>
          <div className="pool-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pool-modal-head">
              <h3>Create Pool</h3>
              <button className="pool-close" onClick={() => setOpenCreate(false)}>✕</button>
            </div>
            <CreatePairForm />
          </div>
        </div>
      ) : null}

      {selectedPair ? (
        <div className="pool-modal-backdrop" onClick={() => setSelectedPair(null)}>
          <div className="pool-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pool-modal-head">
              <h3>{selectedPair.tokenA.symbol}/{selectedPair.tokenB.symbol}</h3>
              <button className="pool-close" onClick={() => setSelectedPair(null)}>✕</button>
            </div>

            <div className="stack">
              <p className="kv"><strong>TVL:</strong> {selectedPair.tvlScore.toFixed(4)}</p>
              <p className="kv"><strong>Reserves:</strong> {Number(formatUnits(selectedPair.reserveA, selectedPair.tokenA.decimals)).toFixed(4)} {selectedPair.tokenA.symbol} / {Number(formatUnits(selectedPair.reserveB, selectedPair.tokenB.decimals)).toFixed(4)} {selectedPair.tokenB.symbol}</p>
              <p className="kv"><strong>LP owned:</strong> {Number(formatUnits(selectedPair.lpBalance, 18)).toFixed(4)}</p>
              <p className="kv"><strong>Your LP position:</strong> {selectedPair.totalSupply > 0n ? ((Number(selectedPair.lpBalance) / Number(selectedPair.totalSupply)) * 100).toFixed(4) : "0.0000"}%</p>

              <label>{selectedPair.tokenA.symbol} amount</label>
              <input value={amountA} onChange={(e) => setAmountA(e.target.value)} />
              <label>{selectedPair.tokenB.symbol} amount</label>
              <input value={amountB} onChange={(e) => setAmountB(e.target.value)} />
              <button onClick={addLiquidity}>Add Liquidity</button>

              <label>LP amount to remove</label>
              <input value={lpToRemove} onChange={(e) => setLpToRemove(e.target.value)} />
              <button onClick={removeLiquidity}>Remove Liquidity</button>

              <div className="status">State: {status}</div>
              {error ? <p className="error-text">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
