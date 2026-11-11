import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import { getAlchemyKeys } from "../config/alchemyKeys";
import redis from "../utils/redis";

export type NetworkType = "mainnet" | "testnet";

export const SESSION_TTL_SECONDS = 24 * 60 * 60;
const COUNTER_KEY = "alchemy:rpc-selection:round-robin";

export interface RpcNetworkConfig {
  chainId: number;
  rpcUrl: string;
}

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
  const selectedNetworks = chainIds.map((chainId) => {
    const network = networks[chainId];
    if (!network?.rpc) {
      throw new RpcConfigurationError(
        `Unsupported ${networkType} chain ID: ${chainId}`
      );
    }
    return { chainId, rpcPrefix: network.rpc };
  });

  const apiKeys = getAlchemyKeys();
  if (apiKeys.length === 0) {
    throw new Error("No Alchemy API keys configured");
  }

  // One atomic Redis counter distributes keys across both network routes.
  const lastPosition = await redis.incrBy(
    COUNTER_KEY,
    selectedNetworks.length
  );
  const firstPosition = lastPosition - selectedNetworks.length + 1;

  const rpcConfigs: RpcNetworkConfig[] = selectedNetworks.map(
    (network, index) => {
      const keyIndex =
        ((firstPosition + index - 1) % apiKeys.length + apiKeys.length) %
        apiKeys.length;
      return {
        chainId: network.chainId,
        rpcUrl: `${network.rpcPrefix}${apiKeys[keyIndex]}`,
      };
    }
  );

  await redis.set(`session:${sessionId}`, "active", {
    EX: SESSION_TTL_SECONDS,
  });
  await redis.set(
    `rpc:${sessionId}:${networkType}`,
    JSON.stringify(rpcConfigs),
    { EX: SESSION_TTL_SECONDS }
  );

  // Keep the existing API response contract (RPC prefixes only).
  return selectedNetworks.map(({ rpcPrefix }) => rpcPrefix);
}
