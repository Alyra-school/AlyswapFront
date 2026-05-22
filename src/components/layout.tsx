"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container">
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" className="brand-link">
            <div className="brand">
              <div className="brand-logo-shell">
                <Image src="/logov3.png" alt="AlySwap logo" width={68} height={68} priority unoptimized />
              </div>
              <div>
                <h1>AlySwap</h1>
              </div>
            </div>
          </Link>
          <nav className="nav nav-inline">
            <Link href="/swap" className={pathname === "/swap" ? "active" : ""}>Swap</Link>
            <Link href="/pool" className={pathname === "/pool" || pathname === "/create-pair" ? "active" : ""}>Pool</Link>
            <Link href="/tokens" className={pathname === "/tokens" ? "active" : ""}>Token</Link>
            <Link href="/rewards" className={pathname === "/rewards" ? "active" : ""}>Rewards</Link>
          </nav>
        </div>
        <WalletButton />
      </header>

      {children}
    </div>
  );
}
