import { JsonRpcProvider } from "ethers";
import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import rpcCache from "../utils/rpcCache";

type NetworkType = "mainnet" | "testnet";

export async function getRpcUrls(chainIds: number[], networkType: NetworkType): Promise<string[]> {
  const networks = networkType === "mainnet" ? M_NETWORKS : T_NETWORKS;
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("Alchemy API key is not configured");

  return Promise.all(chainIds.map(async (chainId) => {
    const cacheKey = `${networkType}:${chainId}`;
    const cached = rpcCache.get<string>(cacheKey);
    if (cached) return cached;

    const network = networks[chainId];
    if (!network) throw new Error(`Unsupported ${networkType} chain ID: ${chainId}`);

    const rpcUrl = `${network.rpc}${apiKey}`;
    const provider = new JsonRpcProvider(rpcUrl);
    const detectedNetwork = await provider.getNetwork();
    if (Number(detectedNetwork.chainId) !== chainId) {
      throw new Error(`RPC chain ID mismatch for chain ID ${chainId}`);
    }

    rpcCache.set(cacheKey, rpcUrl);
    return rpcUrl;
  }));
}