export type TokenConfig = {
  name: string;
  symbol: string;
  decimals: number;
  address: `0x${string}`;
};

export type NetworkContracts = {
  chainId: number;
  network: string;
  factory: `0x${string}`;
  router: `0x${string}`;
  weth: `0x${string}`;
  tokens: TokenConfig[];
};

export type TxState =
  | "idle"
  | "approving"
  | "swapping"
  | "addingLiquidity"
  | "removingLiquidity"
  | "confirming"
  | "success"
  | "error";
