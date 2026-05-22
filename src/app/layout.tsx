import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://alyswap.local"),
  title: {
    default: "AlySwap | Local DEX dApp",
    template: "%s | AlySwap"
  },
  description: "AlySwap est une dApp AMM style Uniswap V2 pour swap, pool et tests locaux Hardhat.",
  applicationName: "AlySwap",
  keywords: ["dapp", "defi", "amm", "uniswap v2", "hardhat", "web3"],
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }]
  },
  openGraph: {
    title: "AlySwap",
    description: "dApp AMM locale avec swap, pool, faucet et activité on-chain.",
    type: "website",
    images: [{ url: "/og-image.png" }]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
