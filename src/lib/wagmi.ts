"use client";

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { defineChain } from "viem";
import { sepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const enableSepolia = process.env.NEXT_PUBLIC_ENABLE_SEPOLIA !== "false";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const defaultNetworkEnv = process.env.NEXT_PUBLIC_DEFAULT_NETWORK || "localhost";
const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "";

const metadata = {
  name: "AlySwap",
  description: "AlySwap Uniswap v2-like dApp",
  url: appUrl,
  icons: ["https://avatars.githubusercontent.com/u/179229932"]
};

const localHardhat = defineChain({
  id: 31337,
  name: "Hardhat Local",
  network: "hardhat-local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] }
  }
});

const sepoliaChain = sepoliaRpc
  ? defineChain({
      ...sepolia,
      rpcUrls: {
        ...sepolia.rpcUrls,
        default: { http: [sepoliaRpc] }
      }
    })
  : sepolia;

const activeNetworks = enableSepolia ? [localHardhat, sepoliaChain] : [localHardhat];
export const networks = activeNetworks as unknown as [any, ...any[]];
const defaultNetwork = defaultNetworkEnv === "sepolia" && enableSepolia ? sepoliaChain : localHardhat;

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks
});

declare global {
  interface Window {
    __alyswapAppKitInitialized?: boolean;
  }
}

export function ensureAppKitInitialized() {
  if (typeof window === "undefined") return;
  if (window.__alyswapAppKitInitialized) return;

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: defaultNetwork as any,
    allowUnsupportedChain: true,
    enableReconnect: true,
    metadata,
    features: {
      analytics: false,
      connectMethodsOrder: ["wallet"]
    }
  });

  window.__alyswapAppKitInitialized = true;
}

export const config = wagmiAdapter.wagmiConfig;
