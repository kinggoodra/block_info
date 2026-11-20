export type NetworkType = "mainnet" | "testnet";
export const SESSION_TTL_SECONDS = 86400;
export interface RpcNetworkConfig { chainId: number; rpcUrl: string; }
export class RpcConfigurationError extends Error { constructor(message: string) { super(message); this.name = "RpcConfigurationError"; } }