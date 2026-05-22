import { TokenBalances } from "@/components/token-balances";
import { TokenFaucet } from "@/components/token-faucet";

export default function TokensPage() {
  return (
    <div className="grid">
      <TokenBalances />
      <TokenFaucet />
    </div>
  );
}
