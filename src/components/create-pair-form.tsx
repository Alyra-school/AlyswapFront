"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
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
  const tokens = deployment.tokens;

  const onCreate = async () => {
    if (!tokens[a] || !tokens[b] || !publicClient) return;
    try {
      setError("");
      setStatus("creating");
      pushToast("Création de pair en cours...", "info");
      addActivity("Create Pair", `${tokens[a].symbol}/${tokens[b].symbol}`, "pending");
      const hash = await writeContractAsync({
        abi: factory.abi,
        address: factory.address,
        functionName: "createPair",
        args: [tokens[a].address, tokens[b].address]
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

      <button onClick={onCreate}>Create Pair</button>
      <div className={status === "error" ? "status error" : status === "success" ? "status success" : "status"}>State: {status}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
