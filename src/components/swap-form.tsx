"use client";

import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi } from "@/contracts/abis";
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
  const { chainId, address } = useAccount();
  const { deployment, router } = getContractsByChain(chainId);
  const tokens = deployment.tokens;
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [amount, setAmount] = useState("1");
  const [txState, setTxState] = useState<TxState>("idle");
  const [error, setError] = useState("");

  const fromToken = tokens[fromIndex];
  const toToken = tokens[toIndex];
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { pushToast } = useToast();

  const enabled = Boolean(fromToken && toToken && fromToken.address !== toToken.address && address);

  const quote = useReadContract({
    abi: router.abi,
    address: router.address,
    functionName: "getAmountsOut",
    args: enabled ? [parseUnits(amount || "0", fromToken.decimals), [fromToken.address, toToken.address]] : undefined,
    query: { enabled }
  });

  const quotedOut = useMemo(() => {
    const amounts = quote.data as bigint[] | undefined;
    if (!amounts || !toToken) return "-";
    return formatUnits(amounts[1], toToken.decimals);
  }, [quote.data, toToken]);

  const onSwap = async () => {
    if (!enabled || !publicClient) return;
    try {
      setError("");
      const amountIn = parseUnits(amount, fromToken.decimals);
      pushToast("Approval en cours...", "info");
      addActivity("Swap", `${amount} ${fromToken.symbol} -> ${toToken.symbol}`, "pending");
      setTxState("approving");
      const approveHash = await writeContractAsync({
        abi: erc20Abi,
        address: fromToken.address,
        functionName: "approve",
        args: [router.address, amountIn]
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setTxState("swapping");
      pushToast("Swap en cours...", "info");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
      const swapHash = await writeContractAsync({
        abi: router.abi,
        address: router.address,
        functionName: "swapExactTokensForTokens",
        args: [amountIn, 0n, [fromToken.address, toToken.address], address as `0x${string}`, deadline]
      });
      setTxState("confirming");
      await publicClient.waitForTransactionReceipt({ hash: swapHash });
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
      <p className="muted">Approve and execute a direct token-to-token route through AlySwap Router.</p>

      <label>From</label>
      <select value={fromIndex} onChange={(e) => setFromIndex(Number(e.target.value))}>
        {tokens.map((t, i) => <option key={t.address} value={i}>{t.symbol}</option>)}
      </select>

      <label>To</label>
      <select value={toIndex} onChange={(e) => setToIndex(Number(e.target.value))}>
        {tokens.map((t, i) => <option key={t.address} value={i}>{t.symbol}</option>)}
      </select>

      <label>Amount In</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />

      <p className="kv"><strong>Quote Out:</strong> {quotedOut} {toToken?.symbol ?? ""}</p>
      <button onClick={onSwap} disabled={!enabled}>Approve + Swap</button>

      <div className={statusClass(txState)}>State: {txState}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
