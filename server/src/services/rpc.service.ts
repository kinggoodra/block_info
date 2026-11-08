import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import rpcCache from "../utils/rpcCache";

type NetworkType = "mainnet" | "testnet";

export async function getRpcUrls(chainIds: number[], networkType: NetworkType): Promise<string[]> {
  const networks = networkType === "mainnet" ? M_NETWORKS : T_NETWORKS;

  return Promise.all(chainIds.map(async (chainId) => {
    const cacheKey = networkType + ":" + chainId;
    const cached = rpcCache.get<string>(cacheKey);
    if (cached) return cached;

    const network = networks[chainId];
    if (!network) throw new Error("Unsupported " + networkType + " chain ID: " + chainId);

    // Return only the public RPC base URL. No API key is read or appended.
    rpcCache.set(cacheKey, network.rpc);
    return network.rpc;
  }));
}