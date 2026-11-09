import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import redis from "../utils/redis";

export type NetworkType = "mainnet" | "testnet";

export const SESSION_TTL_SECONDS = 24 * 60 * 60;

export class RpcConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcConfigurationError";
  }
}

export async function cacheRpcUrls(
  sessionId: string,
  networkType: NetworkType,
  chainIds: number[]
): Promise<string[]> {
  if (!redis.isReady) {
    throw new Error("Redis is not ready");
  }

  const networks = networkType === "mainnet" ? M_NETWORKS : T_NETWORKS;

  // Resolve every requested chain before writing, so invalid input cannot
  // replace a previously valid cache entry with partial data.
  const rpcUrls = chainIds.map((chainId) => {
    const network = networks[chainId];

    if (!network || !network.rpc) {
      throw new RpcConfigurationError(
        "Unsupported " + networkType + " chain ID: " + chainId
      );
    }

    return network.rpc;
  });

  const redisKey = `rpc:${sessionId}:${networkType}`;

  // Keep a shared session marker so both networks use the same browser session.
  await redis.set(`session:${sessionId}`, "active", {
    EX: SESSION_TTL_SECONDS,
  });

  await redis.set(redisKey, JSON.stringify(rpcUrls), {
    EX: SESSION_TTL_SECONDS,
  });

  return rpcUrls;
}
