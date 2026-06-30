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
          <h2 className="hero-title">L&apos;AMM pédagogique d&apos;Alyra pour explorer le swap et la liquidité</h2>
          <p className="muted">
            Simule des swaps, crée des paires, alimente des pools et observe les mécaniques d&apos;un protocole AMM dans un environnement de démonstration.
          </p>
          <p className="hero-disclaimer">
            Ceci est un produit d&apos;Alyra a destination pédagogique. Ne pas utiliser en production.
          </p>
        </div>

        <div className="signal-stage">
          <div className="signal-core">
            <img src="/logov3.png" alt="AlySwap" />
          </div>

          <div className="signal-wave signal-wave-a" />
          <div className="signal-wave signal-wave-b" />
          <div className="signal-wave signal-wave-c" />

          <div className="signal-flow flow-a">
            <span className="signal-dot" />
            <span className="signal-dot" />
            <span className="signal-dot" />
          </div>

          <div className="signal-flow flow-b">
            <span className="signal-dot" />
            <span className="signal-dot" />
            <span className="signal-dot" />
          </div>

          <Link href="/swap" className="signal-tag tag-top-left">Swap Sandbox</Link>
          <Link href="/pool" className="signal-tag tag-top-right">Liquidity Lab</Link>
          <Link href="/tokens" className="signal-tag tag-bottom-left">Token Faucet</Link>
          <div className="signal-tag tag-bottom-right">Learning by doing</div>
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
