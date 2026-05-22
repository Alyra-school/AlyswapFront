"use client";

import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { erc20Abi } from "@/contracts/abis";
import { getContractsByChain } from "@/lib/contracts";

export function TokenBalances() {
  const { chainId, address } = useAccount();
  const { deployment } = getContractsByChain(chainId);

  const nativeBalance = useBalance({
    address,
    query: { enabled: Boolean(address) }
  });

  const tokenBalances = useReadContracts({
    contracts: deployment.tokens.map((token) => ({
      abi: erc20Abi,
      address: token.address,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`]
    })),
    query: { enabled: Boolean(address) && deployment.tokens.length > 0 }
  });

  return (
    <div className="card stack">
      <h2>Token Balances</h2>
      <p className="muted">Soldes du wallet connecté sur le réseau actif.</p>

      <p className="kv">
        <strong>ETH:</strong>{" "}
        {nativeBalance.data ? Number(nativeBalance.data.formatted).toFixed(4) : "0.0000"} {nativeBalance.data?.symbol ?? "ETH"}
      </p>

      {deployment.tokens.map((token, i) => {
        const raw = tokenBalances.data?.[i]?.result as bigint | undefined;
        const formatted = raw !== undefined ? Number(formatUnits(raw, token.decimals)).toFixed(4) : "0.0000";
        return (
          <p className="kv" key={token.address}>
            <strong>{token.symbol}:</strong> {formatted}
          </p>
        );
      })}

      {deployment.tokens.length === 0 ? <p className="muted">No token found. Run backend deployment first.</p> : null}
    </div>
  );
}
