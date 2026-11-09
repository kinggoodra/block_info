import { getAlchemyKeys } from "../config/alchemyKeys";
import redis from "../utils/redis";

const COUNTER_KEY = "alchemy:register-address:round-robin";

type NetworkType = "mainnet" | "testnet";

interface RpcEntry {
  rpcUrl: string;
}

interface RegisterAddressResult {
  publicAddress: string;
  rpcUrls: {
    mainnet: RpcEntry[];
    testnet: RpcEntry[];
  };
}

export class RegisterAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegisterAddressError";
  }
}

function parseSelectedRpcUrls(
  value: string | null,
  networkType: NetworkType
): string[] {
  if (value === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new RegisterAddressError(
      `Stored ${networkType} RPC selection is invalid`
    );
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (url) => typeof url === "string" && url.startsWith("https://")
    )
  ) {
    throw new RegisterAddressError(
      `Stored ${networkType} RPC selection is invalid`
    );
  }

  return parsed;
}

export async function registerAddress(
  publicAddress: string,
  sessionId: string
): Promise<RegisterAddressResult> {
  if (!redis.isReady) {
    throw new Error("Redis is not ready");
  }

  const [mainnetValue, testnetValue] = await Promise.all([
    redis.get(`rpc:${sessionId}:mainnet`),
    redis.get(`rpc:${sessionId}:testnet`),
  ]);

  const selectedNetworks: Record<NetworkType, string[]> = {
    mainnet: parseSelectedRpcUrls(mainnetValue, "mainnet"),
    testnet: parseSelectedRpcUrls(testnetValue, "testnet"),
  };

  const totalNetworks =
    selectedNetworks.mainnet.length + selectedNetworks.testnet.length;

  if (totalNetworks === 0) {
    throw new RegisterAddressError(
      "No networks selected for this session. Select mainnet or testnet networks first."
    );
  }

  // Load keys only after confirming this session has selected networks.
  const apiKeys = getAlchemyKeys();
  if (apiKeys.length === 0) {
    throw new Error("No Alchemy API keys configured");
  }

  // Reserve exactly one global round-robin position per selected RPC URL.
  const lastPosition = await redis.incrBy(COUNTER_KEY, totalNetworks);
  const firstPosition = lastPosition - totalNetworks + 1;

  const rpcUrls: RegisterAddressResult["rpcUrls"] = {
    mainnet: [],
    testnet: [],
  };

  let allocationIndex = 0;
  (["mainnet", "testnet"] as const).forEach((networkType) => {
    selectedNetworks[networkType].forEach((rpcPrefix) => {
      const keyIndex =
        ((firstPosition + allocationIndex - 1) % apiKeys.length +
          apiKeys.length) %
        apiKeys.length;
      const selectedApiKey = apiKeys[keyIndex];

      rpcUrls[networkType].push({
        rpcUrl: `${rpcPrefix}${selectedApiKey}`,
      });
      allocationIndex += 1;
    });
  });

  return { publicAddress, rpcUrls };
}
