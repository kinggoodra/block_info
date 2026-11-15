export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

export interface AlchemyBalanceResponse {
  tokenBalances?: AlchemyTokenBalance[];
  pageKey?: string;
}

export interface AlchemyTokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
}

export interface WalletTokenBalance {
  chainId: number;
  tokenAddress: string;
  rawBalance: string;
  formattedBalance: string | null;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
}

export interface NetworkGroupResult {
  tokens: WalletTokenBalance[];
  failedNetworks: number;
  successfulNetworks: number;
}
