import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";

type NetworkType = "mainnet" | "testnet";

export async function getRpcUrls(chainIds: number[], networkType: NetworkType): Promise<string[]> {
  const networks = networkType === "mainnet" ? M_NETWORKS : T_NETWORKS;

  return chainIds.map((chainId) => {
    const network = networks[chainId];
    if (!network) throw new Error("Unsupported " + networkType + " chain ID: " + chainId);

    // Return only the public RPC base URL. No API key or cache is used.
    return network.rpc;
  });
}