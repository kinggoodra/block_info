export type NetworkType = "mainnet" | "testnet";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
export interface RpcNetworkConfig { chainId: number; rpcUrl: string; }
export class RpcConfigurationError extends Error { constructor(message: string) { super(message); this.name = "RpcConfigurationError"; } }