"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi } from "@/contracts/abis";
import { getContractsByChain } from "@/lib/contracts";
import type { TxState } from "@/types/contracts";
import { toUserErrorMessage } from "@/lib/tx-errors";
import { useToast } from "@/components/toast-provider";
import { addActivity } from "@/lib/activity";
import { factoryAbi } from "@/contracts/abis";

function statusClass(state: TxState) {
  if (state === "success") return "status success";
  if (state === "error") return "status error";
  return "status";
}

export function PoolForm() {
  const { chainId, address } = useAccount();
  const { deployment, router, factory } = getContractsByChain(chainId);
  const tokens = deployment.tokens;
  const [a, setA] = useState("10");
  const [b, setB] = useState("10");
  const [liquidity, setLiquidity] = useState("1");
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [txState, setTxState] = useState<TxState>("idle");
  const [error, setError] = useState("");

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { pushToast } = useToast();

  const tokenPairs = [];
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j < tokens.length; j += 1) {
      tokenPairs.push({
        tokenA: tokens[i],
        tokenB: tokens[j]
      });
    }
  }

  const pairReads = useReadContracts({
    contracts: tokenPairs.map((p) => ({
      abi: factoryAbi,
      address: factory.address,
      functionName: "getPair" as const,
      args: [p.tokenA.address, p.tokenB.address]
    })),
    query: { enabled: tokenPairs.length > 0 }
  });

  const availablePairs = tokenPairs
    .map((p, idx) => {
      const pairAddress = pairReads.data?.[idx]?.result as `0x${string}` | undefined;
      return { ...p, pairAddress };
    })
    .filter((p) => p.pairAddress && p.pairAddress !== "0x0000000000000000000000000000000000000000");

  const selectedPair = availablePairs[selectedPairIndex] ?? availablePairs[0];

  const addLiquidity = async () => {
    if (!selectedPair || !publicClient || !address) return;
    try {
      setError("");
      pushToast("Ajout de liquidité en cours...", "info");
      addActivity("Pool", `Add ${a}/${b} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "pending");
      setTxState("approving");
      const amountA = parseUnits(a, selectedPair.tokenA.decimals);
      const amountB = parseUnits(b, selectedPair.tokenB.decimals);

      const tx1 = await writeContractAsync({ abi: erc20Abi, address: selectedPair.tokenA.address, functionName: "approve", args: [router.address, amountA] });
      await publicClient.waitForTransactionReceipt({ hash: tx1 });

      const tx2 = await writeContractAsync({ abi: erc20Abi, address: selectedPair.tokenB.address, functionName: "approve", args: [router.address, amountB] });
      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      setTxState("addingLiquidity");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const tx3 = await writeContractAsync({
        abi: router.abi,
        address: router.address,
        functionName: "addLiquidity",
        args: [selectedPair.tokenA.address, selectedPair.tokenB.address, amountA, amountB, 0n, 0n, address as `0x${string}`, deadline]
      });
      setTxState("confirming");
      await publicClient.waitForTransactionReceipt({ hash: tx3 });
      setTxState("success");
      pushToast("Liquidité ajoutée", "success");
      addActivity("Pool", `Add ${a}/${b} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "success");
    } catch (e) {
      setTxState("error");
      const message = toUserErrorMessage(e, "Add liquidity failed");
      setError(message);
      pushToast(message, "error");
      addActivity("Pool", `Add ${a}/${b} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "error");
    }
  };

  const removeLiquidity = async () => {
    if (!selectedPair || !publicClient || !address) return;
    try {
      setError("");
      pushToast("Retrait de liquidité en cours...", "info");
      addActivity("Pool", `Remove LP ${liquidity} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "pending");
      setTxState("removingLiquidity");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const tx = await writeContractAsync({
        abi: router.abi,
        address: router.address,
        functionName: "removeLiquidity",
        args: [selectedPair.tokenA.address, selectedPair.tokenB.address, parseUnits(liquidity, 18), 0n, 0n, address as `0x${string}`, deadline]
      });
      setTxState("confirming");
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setTxState("success");
      pushToast("Liquidité retirée", "success");
      addActivity("Pool", `Remove LP ${liquidity} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "success");
    } catch (e) {
      setTxState("error");
      const message = toUserErrorMessage(e, "Remove liquidity failed");
      setError(message);
      pushToast(message, "error");
      addActivity("Pool", `Remove LP ${liquidity} ${selectedPair.tokenA.symbol}-${selectedPair.tokenB.symbol}`, "error");
    }
  };

  if (tokens.length < 2) {
    return <p className="muted">Deploy contracts first from backend and sync deployment files.</p>;
  }

  if (availablePairs.length === 0) {
    return (
      <div className="card stack">
        <h2>Pool Management</h2>
        <p className="muted">Aucune paire disponible. Crée une paire dans le bloc \"Create New Pair\".</p>
      </div>
    );
  }

  return (
    <div className="card stack">
      <h2>Pool Management</h2>
      <label>Pair</label>
      <select value={selectedPairIndex} onChange={(e) => setSelectedPairIndex(Number(e.target.value))}>
        {availablePairs.map((p, idx) => (
          <option key={`${p.tokenA.address}-${p.tokenB.address}`} value={idx}>
            {p.tokenA.symbol}/{p.tokenB.symbol}
          </option>
        ))}
      </select>
      <p className="muted">Pair: {selectedPair.tokenA.symbol}/{selectedPair.tokenB.symbol}</p>

      <label>{selectedPair.tokenA.symbol} amount</label>
      <input value={a} onChange={(e) => setA(e.target.value)} />

      <label>{selectedPair.tokenB.symbol} amount</label>
      <input value={b} onChange={(e) => setB(e.target.value)} />

      <button onClick={addLiquidity}>Add Liquidity</button>

      <label>LP amount to remove</label>
      <input value={liquidity} onChange={(e) => setLiquidity(e.target.value)} />

      <button onClick={removeLiquidity}>Remove Liquidity</button>

      <div className={statusClass(txState)}>State: {txState}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
