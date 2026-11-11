import { JsonRpcProvider } from "ethers";
import redis from "../utils/redis";
import { getSessionRpcNetworksByType } from "./rpc-config.service";
import { RpcNetworkConfig } from "./rpc.service";

const BALANCE_TTL_SECONDS = 60;
const MAX_NETWORK_CONCURRENCY = 4;

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyBalanceResponse {
  tokenBalances?: AlchemyTokenBalance[];
  pageKey?: string;
}

export interface WalletTokenBalance {
  chainId: number;
  tokenAddress: string;
  rawBalance: string;
}

interface NetworkResult {
  chainId: number;
  status: "success" | "failed";
  tokens: WalletTokenBalance[];
  error?: string;
}

async function getNetworkTokens(
  walletAddress: string,
  network: RpcNetworkConfig
): Promise<WalletTokenBalance[]> {
  const { chainId, rpcUrl } = network;
  const cacheKey =
    `wallet:tokens:${chainId}:${walletAddress.toLowerCase()}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as WalletTokenBalance[];
    } catch {
      await redis.del(cacheKey);
    }
  }

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const actualNetwork = await provider.getNetwork();
  if (Number(actualNetwork.chainId) !== chainId) {
    throw new Error(`Chain ID mismatch: expected ${chainId}`);
  }

  let pageKey: string | undefined;
  const activeTokens: AlchemyTokenBalance[] = [];
  const seenPageKeys = new Set<string>();

  do {
    const options = {
      maxCount: 100,
      ...(pageKey ? { pageKey } : {}),
    };
    const result = (await provider.send(
      "alchemy_getTokenBalances",
      [walletAddress, "erc20", options]
    )) as AlchemyBalanceResponse;

    for (const token of result.tokenBalances ?? []) {
      if (token.tokenBalance && BigInt(token.tokenBalance) > 0n) {
        activeTokens.push(token);
      }
    }

    pageKey = result.pageKey || undefined;
    if (pageKey) {
      if (seenPageKeys.has(pageKey)) {
        throw new Error("Repeated Alchemy pagination key");
      }
      seenPageKeys.add(pageKey);
    }
  } while (pageKey);

  const tokens = activeTokens.map((token) => ({
    chainId,
    tokenAddress: token.contractAddress,
    rawBalance: token.tokenBalance,
  }));

  await redis.set(cacheKey, JSON.stringify(tokens), {
    EX: BALANCE_TTL_SECONDS,
  });
  return tokens;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  callback: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = {
          status: "fulfilled",
          value: await callback(items[index]),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => worker()
    )
  );
  return results;
}

export async function getWalletTokenBalances(
  walletAddress: string,
  sessionId: string
): Promise<{ tokens: WalletTokenBalance[]; networks: NetworkResult[] }> {
  const configuration = await getSessionRpcNetworksByType(sessionId);
  const selectedNetworks = [
    ...configuration.mainnet,
    ...configuration.testnet,
  ];

  if (selectedNetworks.length === 0) {
    throw new Error("No networks selected");
  }

  const results = await mapWithConcurrency(
    selectedNetworks,
    MAX_NETWORK_CONCURRENCY,
    (network) => getNetworkTokens(walletAddress, network)
  );

  const tokens: WalletTokenBalance[] = [];
  const networks: NetworkResult[] = results.map((result, index) => {
    const chainId = selectedNetworks[index].chainId;
    if (result.status === "fulfilled") {
      tokens.push(...result.value);
      return { chainId, status: "success", tokens: result.value };
    }

    return {
      chainId,
      status: "failed",
      tokens: [],
      error:
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown network error",
    };
  });

  return { tokens, networks };
}
