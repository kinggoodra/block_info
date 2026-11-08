import M_NETWORKS from "../config/mainnet";
import T_NETWORKS from "../config/testnet";
import { getAlchemyKeys } from "../config/alchemyKeys";
import redis from "../utils/redis";

const COUNTER_KEY = "alchemy:register-address:round-robin";

type NetworkType = "mainnet" | "testnet";

interface NetworkEntry {
  network: NetworkType;
  rpcPrefix: string;
}

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

export async function registerAddress(
  publicAddress: string
): Promise<RegisterAddressResult> {
  const apiKeys = getAlchemyKeys();

  const mainnetEntries: NetworkEntry[] = Object.values(M_NETWORKS).map(
    (config) => ({
      network: "mainnet",
      rpcPrefix: config.rpc,
    })
  );

  const testnetEntries: NetworkEntry[] = Object.values(T_NETWORKS).map(
    (config) => ({
      network: "testnet",
      rpcPrefix: config.rpc,
    })
  );

  const allNetworks = [...mainnetEntries, ...testnetEntries];

  if (allNetworks.length === 0) {
    throw new Error("No network configurations available");
  }

  if (!redis.isReady) {
    throw new Error("Redis is not ready");
  }

  // Reserve one consecutive Redis counter position per configured network.
  const totalNetworks = allNetworks.length;
  const lastPosition = await redis.incrBy(COUNTER_KEY, totalNetworks);
  const firstPosition = lastPosition - totalNetworks + 1;

  const rpcUrls: RegisterAddressResult["rpcUrls"] = {
    mainnet: [],
    testnet: [],
  };

  allNetworks.forEach((network, index) => {
    const keyIndex = (firstPosition + index - 1) % apiKeys.length;
    const selectedApiKey = apiKeys[keyIndex];

    const result: RpcEntry = {
      rpcUrl: `${network.rpcPrefix}${selectedApiKey}`,
    };

    rpcUrls[network.network].push(result);
  });

  return {
    publicAddress,
    rpcUrls,
  };
}
