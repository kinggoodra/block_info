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

/**
 * Complete token data returned by the API.
 */
export interface WalletTokenBalance {
  chainId: number;
  tokenAddress: string;
  rawBalance: string;
  formattedBalance: string | null;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
}

/**
 * Internal network-fetch statistics.
 * These are used by the controller and are not sent as API fields.
 */
export interface NetworkGroupResult {
  tokens: WalletTokenBalance[];
  failedNetworks: number;
  successfulNetworks: number;
}
