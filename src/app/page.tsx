"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getContractsByChain } from "@/lib/contracts";
import { ActivityFeed } from "@/components/activity-feed";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { chainId, isConnected } = useAccount();
  const { deployment, factory, router } = getContractsByChain(chainId);
  const networkLabel = deployment.network === "sepolia" ? "Sepolia" : "Hardhat Local";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="stack">
      <section className="hero-shell card">
        <div className="hero-copy">
          <p className="hero-kicker">AlySwap Protocol</p>
          <h2 className="hero-title">L&apos;AMM d&apos;Alyra avec des failles...</h2>
          <p className="muted">
            Simule des swaps, crée des paires, ajoute de la liquidité et observe le comportement du protocole !.
          </p>
        </div>

        <div className="orbit-stage">
          <div className="orbit-core">
            <img src="/logov3.png" alt="AlySwap" />
          </div>

          <div className="orbit-ring orbit-ring-a">
            <span className="planet planet-a" />
            <span className="planet planet-b" />
          </div>

          <div className="orbit-ring orbit-ring-b">
            <span className="planet planet-c" />
            <span className="planet planet-d" />
            <span className="planet planet-e" />
          </div>

          <Link href="/swap" className="orbit-tag tag-top-left">Swap Engine</Link>
          <Link href="/pool" className="orbit-tag tag-top-right">Liquidity Layer</Link>
          <Link href="/tokens" className="orbit-tag tag-bottom-left">Token Faucet</Link>
          <div className="orbit-tag tag-bottom-right">... et des erreurs ?</div>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Réseau Connecté</h2>
          <p className="kv"><strong>Network:</strong> {mounted ? (isConnected ? networkLabel : "Non connecté") : "-"}</p>
          <p className="kv"><strong>Chain ID:</strong> {chainId ?? "-"}</p>
          <p className="kv"><strong>Factory:</strong> {factory.address}</p>
          <p className="kv"><strong>Router:</strong> {router.address}</p>
          <p className="kv"><strong>WETH:</strong> {deployment.weth}</p>
          <p className="muted">Tokens disponibles: {deployment.tokens.length}</p>
        </article>

        <ActivityFeed />
      </section>
    </div>
  );
}
