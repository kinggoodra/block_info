import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import rpcCache from "../utils/rpcCache";

type NetworkType = "mainnet" | "testnet";

export function getRpcUrls(
  chainIds: number[],
  networkType: NetworkType
): string[] {
  const networks = networkType === "mainnet" ? M_NETWORKS : T_NETWORKS;
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("Alchemy API key is not configured");
  }

  return chainIds.map((chainId) => {
    const cacheKey = `${networkType}:${chainId}`;
    const cached = rpcCache.get<string>(cacheKey);

    if (cached) return cached;

    const network = networks[chainId];
    if (!network) {
      throw new Error(`Unsupported ${networkType} chain ID: ${chainId}`);
    }

    const rpcUrl = `${network.rpc}${apiKey}`;
    rpcCache.set(cacheKey, rpcUrl);
    return rpcUrl;
  });
}