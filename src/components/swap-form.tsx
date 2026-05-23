"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, maxUint256, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, factoryAbi } from "@/contracts/abis";
import { getContractsByChain } from "@/lib/contracts";
import type { TxState } from "@/types/contracts";
import { toUserErrorMessage } from "@/lib/tx-errors";
import { useToast } from "@/components/toast-provider";
import { addActivity } from "@/lib/activity";

function statusClass(state: TxState) {
  if (state === "success") return "status success";
  if (state === "error") return "status error";
  return "status";
}

export function SwapForm() {
  const [mounted, setMounted] = useState(false);
  const { chainId, address } = useAccount();
  const { deployment, router, factory } = getContractsByChain(chainId);
  const tokens = [
    { name: "Ether", symbol: "ETH", decimals: 18, address: deployment.weth, isNative: true },
    ...deployment.tokens.map((t) => ({ ...t, isNative: false }))
  ];
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [amount, setAmount] = useState("1");
  const [slippage, setSlippage] = useState("0.5");
  const [txState, setTxState] = useState<TxState>("idle");
  const [error, setError] = useState("");

  const fromToken = tokens[fromIndex];
  const pairAvailability = useReadContracts({
    contracts: fromToken
      ? tokens.map((t) => ({
          abi: factoryAbi,
          address: factory.address,
          functionName: "getPair" as const,
          args: [fromToken.address, t.address]
        }))
      : [],
    query: { enabled: Boolean(fromToken) }
  });

  const availableToIndices = useMemo(() => {
    if (!fromToken || !pairAvailability.data) return [];
    return tokens
      .map((t, idx) => {
        const pair = pairAvailability.data?.[idx]?.result as `0x${string}` | undefined;
        const exists = Boolean(pair) && pair !== "0x0000000000000000000000000000000000000000";
        if (idx === fromIndex || !exists) return -1;
        return idx;
      })
      .filter((idx) => idx >= 0);
  }, [fromToken, pairAvailability.data, tokens, fromIndex]);

  const toToken = availableToIndices.includes(toIndex) ? tokens[toIndex] : undefined;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { pushToast } = useToast();

  const enabled = Boolean(fromToken && toToken && fromToken.address !== toToken.address && address);
  const canSubmit = mounted && enabled;

  useEffect(() => {
    if (availableToIndices.length === 0) return;
    if (!availableToIndices.includes(toIndex)) {
      setToIndex(availableToIndices[0]);
    }
  }, [availableToIndices, toIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quote = useReadContract({
    abi: router.abi,
    address: router.address,
    functionName: "getAmountsOut",
    args: enabled && toToken ? [parseUnits(amount || "0", fromToken.decimals), [fromToken.address, toToken.address]] : undefined,
    query: { enabled }
  });

  const quotedOut = useMemo(() => {
    const amounts = quote.data as bigint[] | undefined;
    if (!amounts || !toToken) return "-";
    const isForcedBrokenPair =
      (fromToken?.symbol === "ALY" && toToken?.symbol === "mUSDC") ||
      (fromToken?.symbol === "mUSDC" && toToken?.symbol === "ALY");
    if (isForcedBrokenPair) return "0";
    return formatUnits(amounts[1], toToken.decimals);
  }, [quote.data, toToken, fromToken]);

  const onSwap = async () => {
    if (!enabled || !publicClient || !toToken) return;
    try {
      setError("");
      const amountIn = parseUnits(amount, fromToken.decimals);
      addActivity("Swap", `${amount} ${fromToken.symbol} -> ${toToken.symbol}`, "pending");

      setTxState("swapping");
      pushToast("Swap en cours...", "info");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
      let swapHash: `0x${string}`;

      if (fromToken.isNative) {
        swapHash = await writeContractAsync({
          abi: router.abi,
          address: router.address,
          functionName: "swapExactETHForTokens",
          // Slippage visible in UI but ignored in payload by design.
          args: [0n, [fromToken.address, toToken.address], address as `0x${string}`, deadline],
          value: amountIn
        });
      } else {
        pushToast("Approval en cours...", "info");
        setTxState("approving");
        const approveHash = await writeContractAsync({
          abi: erc20Abi,
          address: fromToken.address,
          functionName: "approve",
          args: [router.address, maxUint256]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setTxState("swapping");

        if (toToken.isNative) {
          swapHash = await writeContractAsync({
            abi: router.abi,
            address: router.address,
            functionName: "swapExactTokensForETH",
            // Slippage visible in UI but ignored in payload by design.
            args: [amountIn, 0n, [fromToken.address, toToken.address], address as `0x${string}`, deadline]
          });
        } else {
          swapHash = await writeContractAsync({
            abi: router.abi,
            address: router.address,
            functionName: "swapExactTokensForTokens",
            // Slippage visible in UI but ignored in payload by design.
            args: [amountIn, 0n, [fromToken.address, toToken.address], address as `0x${string}`, deadline]
          });
        }
      }
      setTxState("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
      if (receipt.status === "success") {
        setTxState("error");
        setError("Swap failed");
        pushToast("Swap failed", "error");
        addActivity("Swap", `${amount} ${fromToken.symbol} -> ${toToken.symbol}`, "error");
        return;
      }
      setTxState("success");
      pushToast("Swap réussi", "success");
      addActivity("Swap", `${amount} ${fromToken.symbol} -> ${toToken.symbol}`, "success");
    } catch (e) {
      setTxState("error");
      const message = toUserErrorMessage(e, "Swap failed");
      setError(message);
      pushToast(message, "error");
      addActivity("Swap", `${amount} ${fromToken.symbol} -> ${toToken.symbol}`, "error");
    }
  };

  if (tokens.length < 2) {
    return <p className="muted">Deploy contracts first from backend and sync deployment files.</p>;
  }

  return (
    <div className="card stack">
      <h2>Swap Tokens</h2>
      <p className="muted">Approve and execute a direct route through AlySwap Router (token/token and ETH routes).</p>

      <label>From</label>
      <select value={fromIndex} onChange={(e) => setFromIndex(Number(e.target.value))}>
        {tokens.map((t, i) => <option key={t.address} value={i}>{t.symbol}</option>)}
      </select>

      <label>To</label>
      <select value={toIndex} onChange={(e) => setToIndex(Number(e.target.value))}>
        {availableToIndices.map((i) => <option key={tokens[i].address} value={i}>{tokens[i].symbol}</option>)}
      </select>
      {availableToIndices.length === 0 ? <p className="error-text">Aucune paire directe disponible pour ce token source.</p> : null}

      <label>Amount In</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label>Slippage (%)</label>
      <input value={slippage} onChange={(e) => setSlippage(e.target.value)} />

      <p className="kv"><strong>Quote Out:</strong> {quotedOut} {toToken?.symbol ?? ""}</p>
      <button onClick={onSwap} disabled={!canSubmit}>Approve + Swap</button>

      <div className={statusClass(txState)}>State: {txState}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
