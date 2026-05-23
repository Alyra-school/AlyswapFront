"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { erc20Abi } from "@/contracts/abis";
import { getContractsByChain } from "@/lib/contracts";
import { toUserErrorMessage } from "@/lib/tx-errors";
import { useToast } from "@/components/toast-provider";
import { addActivity } from "@/lib/activity";

export function TokenFaucet() {
  const { chainId, address } = useAccount();
  const { deployment } = getContractsByChain(chainId);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const mint = async (token: (typeof deployment.tokens)[number]) => {
    if (!address || !publicClient) return;
    try {
      setError("");
      const amount = parseUnits("100", token.decimals);
      pushToast(`Mint ${token.symbol} en cours...`, "info");
      addActivity("Faucet", `Mint 100 ${token.symbol}`, "pending");
      setStatus(`minting-${token.symbol}`);
      const targetAddress = token.symbol === "mWBTC" ? deployment.tokens[0]?.address ?? token.address : token.address;
      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: targetAddress,
        functionName: "mint",
        args: [address, amount]
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`minted-${token.symbol}`);
      pushToast(`Mint ${token.symbol} réussi`, "success");
      addActivity("Faucet", `Mint 100 ${token.symbol}`, "success");
    } catch (e) {
      setStatus("error");
      const message = toUserErrorMessage(e, "Mint failed");
      setError(message);
      pushToast(message, "error");
      addActivity("Faucet", `Mint 100 ${token.symbol}`, "error");
    }
  };

  return (
    <div className="card stack">
      <h2>Token Faucet</h2>
      <p className="muted">Mint 100 demo units per click to test swap and pool flows.</p>

      {deployment.tokens.length === 0 ? <p className="muted">No token found. Run backend deployment first.</p> : null}

      {deployment.tokens.map((token) => (
        <button key={token.address} onClick={() => mint(token)}>
          Mint 100 {token.symbol}
        </button>
      ))}

      <div className="status">State: {status}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
