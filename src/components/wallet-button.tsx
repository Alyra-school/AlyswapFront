"use client";

import { useEffect } from "react";
import { useBalance, useAccount } from "wagmi";
import { ensureAppKitInitialized } from "@/lib/wagmi";
import { useState } from "react";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ensureAppKitInitialized();
    setMounted(true);
  }, []);

  const { address, isConnected } = useAccount();
  const balance = useBalance({
    address,
    query: { enabled: Boolean(address) }
  });

  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} suppressHydrationWarning>
        <appkit-button balance="hide" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {isConnected ? (
        <span className="status">
          {balance.data ? Number(balance.data.formatted).toFixed(4) : "0.0000"} {balance.data?.symbol ?? "ETH"}
        </span>
      ) : null}
      <appkit-button balance="hide" />
    </div>
  );
}
