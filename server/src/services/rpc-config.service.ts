import redis from "../utils/redis";
import { RpcNetworkConfig } from "./rpc.service";

export interface SessionRpcConfiguration {
  mainnet: RpcNetworkConfig[];
  testnet: RpcNetworkConfig[];
}

function parseRpcConfiguration(
  value: string | null,
  networkType: "mainnet" | "testnet"
): RpcNetworkConfig[] {
  if (value === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Stored ${networkType} RPC configuration is invalid`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Stored ${networkType} RPC configuration is invalid`);
  }

  return parsed.map((item: unknown) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("chainId" in item) ||
      !Number.isSafeInteger(item.chainId) ||
      (item.chainId as number) <= 0 ||
      !("rpcUrl" in item) ||
      typeof item.rpcUrl !== "string" ||
      !item.rpcUrl.startsWith("https://")
    ) {
      throw new Error(`Stored ${networkType} RPC network is invalid`);
    }

    return {
      chainId: item.chainId as number,
      rpcUrl: item.rpcUrl,
    };
  });
}

export async function getSessionRpcNetworksByType(
  sessionId: string
): Promise<SessionRpcConfiguration> {
  if (!redis.isReady) {
    throw new Error("Redis is not ready");
  }

  const [mainnetValue, testnetValue] = await Promise.all([
    redis.get(`rpc:${sessionId}:mainnet`),
    redis.get(`rpc:${sessionId}:testnet`),
  ]);

  return {
    mainnet: parseRpcConfiguration(mainnetValue, "mainnet"),
    testnet: parseRpcConfiguration(testnetValue, "testnet"),
  };
}

export async function getSessionRpcNetworks(
  sessionId: string
): Promise<RpcNetworkConfig[]> {
  const configuration = await getSessionRpcNetworksByType(sessionId);
  return [...configuration.mainnet, ...configuration.testnet];
}
