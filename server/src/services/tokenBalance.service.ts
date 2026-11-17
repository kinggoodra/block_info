import { JsonRpcProvider } from "ethers";
import { mapWithConcurrency } from "../utils/concurrency";
import {
  AlchemyBalanceResponse,
  AlchemyTokenBalance,
  NetworkGroupResult,
  WalletTokenBalance,
} from "../types/tokenBalance.types";
import {
  getTokenMetadata,
  formatTokenBalance,
} from "./tokenMetadata.service";
import { getSessionRpcNetworksByType } from "./rpc-config.service";
import { RpcNetworkConfig } from "./rpc.service";

const MAX_NETWORK_CONCURRENCY = 4;
const MAX_METADATA_CONCURRENCY = 4;

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

  const rawTokens = activeTokens.map((token) => ({
    tokenAddress: token.contractAddress.toLowerCase(),
    rawBalance: token.tokenBalance,
  }));

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

  return {
    tokens,
    failedNetworks,
    successfulNetworks,
  };
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
