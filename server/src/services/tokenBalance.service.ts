import { JsonRpcProvider } from "ethers";
import redis from "../utils/redis";
import { mapWithConcurrency } from "../utils/concurrency";
import {
  AlchemyBalanceResponse,
  AlchemyTokenBalance,
  CachedTokenBalance,
  NetworkGroupResult,
  WalletTokenBalance,
} from "../types/tokenBalance.types";
import { getTokenMetadata, formatTokenBalance } from "./tokenMetadata.service";
import { getSessionRpcNetworksByType } from "./rpc-config.service";
import { RpcNetworkConfig } from "./rpc.service";

const BALANCE_TTL_SECONDS = 60;
const MAX_NETWORK_CONCURRENCY = 4;
const MAX_METADATA_CONCURRENCY = 8;

type CachedTokenBalances = Record<string, CachedTokenBalance>;

async function buildTokenResponse(
  chainId: number,
  rawTokens: Array<{ tokenAddress: string; rawBalance: string }>,
  provider: JsonRpcProvider
): Promise<WalletTokenBalance[]> {
  const metadataResults = await mapWithConcurrency(
    rawTokens,
    MAX_METADATA_CONCURRENCY,
    (token) => getTokenMetadata(token.tokenAddress, provider)
  );

  return rawTokens.map((token, index) => {
    const metadataResult = metadataResults[index];
    const metadata =
      metadataResult.status === "fulfilled"
        ? metadataResult.value
        : { name: null, symbol: null, decimals: null };

    return {
      chainId,
      tokenAddress: token.tokenAddress,
      rawBalance: token.rawBalance,
      formattedBalance: formatTokenBalance(
        token.rawBalance,
        metadata.decimals
      ),
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
    };
  });
}

async function getNetworkTokens(
  walletAddress: string,
  network: RpcNetworkConfig
): Promise<WalletTokenBalance[]> {
  const { chainId, rpcUrl } = network;

  // v4 avoids reusing the previous full-token-object cache format.
  const cacheKey =
    `wallet:tokens:v4:${chainId}:${walletAddress.toLowerCase()}`;

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const actualNetwork = await provider.getNetwork();

  if (Number(actualNetwork.chainId) !== chainId) {
    throw new Error(`Chain ID mismatch: expected ${chainId}`);
  }

  const cached = await redis.get(cacheKey);

  if (cached) {
    try {
      const cachedBalances = JSON.parse(cached) as CachedTokenBalances;

      if (
        cachedBalances === null ||
        typeof cachedBalances !== "object" ||
        Array.isArray(cachedBalances)
      ) {
        throw new Error("Invalid token balance cache structure");
      }

      const rawTokens = Object.entries(cachedBalances).map(
        ([tokenAddress, balance]) => {
          if (
            !balance ||
            typeof balance.rawBalance !== "string"
          ) {
            throw new Error("Invalid cached token balance");
          }

          return {
            tokenAddress,
            rawBalance: balance.rawBalance,
          };
        }
      );

      // Metadata is fetched on cache hits because Redis stores no decimals.
      // The backend uses decimals to calculate formattedBalance.
      return buildTokenResponse(chainId, rawTokens, provider);
    } catch {
      await redis.del(cacheKey);
    }
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

  const rawTokens = activeTokens.map((token) => ({
    tokenAddress: token.contractAddress.toLowerCase(),
    rawBalance: token.tokenBalance,
  }));

  // Redis stores only rawBalance. Token address is the object key
  // used to associate each balance with its token.
  const cachedBalances: CachedTokenBalances = {};

  for (const token of rawTokens) {
    cachedBalances[token.tokenAddress] = {
      rawBalance: token.rawBalance,
    };
  }

  await redis.set(cacheKey, JSON.stringify(cachedBalances), {
    EX: BALANCE_TTL_SECONDS,
  });

  // formattedBalance and metadata are added only to the API response.
  return buildTokenResponse(chainId, rawTokens, provider);
}

async function getNetworkGroupTokens(
  walletAddress: string,
  networks: RpcNetworkConfig[]
): Promise<NetworkGroupResult> {
  const results = await mapWithConcurrency(
    networks,
    MAX_NETWORK_CONCURRENCY,
    (network) => getNetworkTokens(walletAddress, network)
  );

  const tokens: WalletTokenBalance[] = [];
  let failedNetworks = 0;
  let successfulNetworks = 0;

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      successfulNetworks += 1;
      tokens.push(...result.value);
    } else {
      failedNetworks += 1;
    }
  });

  return { tokens, failedNetworks, successfulNetworks };
}

export async function getWalletTokenBalances(
  walletAddress: string,
  sessionId: string
): Promise<{
  mainnet: WalletTokenBalance[];
  testnet: WalletTokenBalance[];
  failedNetworks: number;
  successfulNetworks: number;
  totalNetworks: number;
}> {
  const configuration = await getSessionRpcNetworksByType(sessionId);
  const totalNetworks =
    configuration.mainnet.length + configuration.testnet.length;

  if (totalNetworks === 0) {
    throw new Error("No networks selected");
  }

  const [mainnetResult, testnetResult] = await Promise.all([
    getNetworkGroupTokens(walletAddress, configuration.mainnet),
    getNetworkGroupTokens(walletAddress, configuration.testnet),
  ]);

  return {
    mainnet: mainnetResult.tokens,
    testnet: testnetResult.tokens,
    failedNetworks:
      mainnetResult.failedNetworks + testnetResult.failedNetworks,
    successfulNetworks:
      mainnetResult.successfulNetworks + testnetResult.successfulNetworks,
    totalNetworks,
  };
}
