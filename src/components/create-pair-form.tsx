"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { getContractsByChain } from "@/lib/contracts";
import { toUserErrorMessage } from "@/lib/tx-errors";
import { useToast } from "@/components/toast-provider";
import { addActivity } from "@/lib/activity";

export function CreatePairForm() {
  const { chainId } = useAccount();
  const { deployment, factory } = getContractsByChain(chainId);
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const tokens = [
    { name: "Ether", symbol: "ETH", decimals: 18, address: deployment.weth },
    ...deployment.tokens
  ];
  const tokenA = tokens[a];
  const tokenB = tokens[b];

  const pairRead = useReadContract({
    abi: factory.abi,
    address: factory.address,
    functionName: "getPair",
    args: tokenA && tokenB ? [tokenA.address, tokenB.address] : undefined,
    query: { enabled: Boolean(tokenA && tokenB) }
  });

  const existingPairAddress = pairRead.data as `0x${string}` | undefined;
  const isExistingPair =
    Boolean(existingPairAddress) && existingPairAddress !== "0x0000000000000000000000000000000000000000";
  const isSameToken = a === b;
  const isCreateDisabled = isSameToken || isExistingPair;

  const onCreate = async () => {
    if (!tokens[a] || !tokens[b] || !publicClient || isCreateDisabled) return;
    try {
      setError("");
      setStatus("creating");
      pushToast("Création de pair en cours...", "info");
      addActivity("Create Pair", `${tokens[a].symbol}/${tokens[b].symbol}`, "pending");
      const hash = await writeContractAsync({
        abi: factory.abi,
        address: factory.address,
        functionName: "createPair",
        args: [tokens[a].address as `0x${string}`, tokens[b].address as `0x${string}`]
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("success");
      pushToast("Pair créée", "success");
      addActivity("Create Pair", `${tokens[a].symbol}/${tokens[b].symbol}`, "success");
    } catch (e) {
      setStatus("error");
      const message = toUserErrorMessage(e, "Create pair failed");
      setError(message);
      pushToast(message, "error");
      addActivity("Create Pair", `${tokens[a].symbol}/${tokens[b].symbol}`, "error");
    }
  };

  if (tokens.length < 2) {
    return <p className="muted">Deploy contracts first from backend and sync deployment files.</p>;
  }

  return (
    <div className="card stack">
      <h2>Create New Pair</h2>
      <p className="muted">This action initializes an AMM pair in the AlySwap factory.</p>

      <label>Token A</label>
      <select value={a} onChange={(e) => setA(Number(e.target.value))}>
        {tokens.map((t, i) => <option key={t.address} value={i}>{t.symbol}</option>)}
      </select>

      <label>Token B</label>
      <select value={b} onChange={(e) => setB(Number(e.target.value))}>
        {tokens.map((t, i) => <option key={t.address} value={i}>{t.symbol}</option>)}
      </select>

      {isSameToken ? (
        <p className="error-text">Token A et Token B doivent être différents.</p>
      ) : null}
      {isExistingPair ? (
        <p className="error-text">
          Cette paire existe déjà: {existingPairAddress}
        </p>
      ) : null}

      <button onClick={onCreate} disabled={isCreateDisabled}>Create Pair</button>
      <div className={status === "error" ? "status error" : status === "success" ? "status success" : "status"}>State: {status}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
