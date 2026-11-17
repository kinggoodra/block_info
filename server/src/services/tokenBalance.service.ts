import { Contract, JsonRpcProvider } from "ethers";
import redis from "../utils/redis";
import { mapWithConcurrency } from "../utils/concurrency";
import { getTokenMetadata, formatTokenBalance } from "./tokenMetadata.service";
import { getSessionRpcNetworksByType } from "./rpc-config.service";
import { RpcNetworkConfig } from "./rpc.service";
import { WalletTokenBalance } from "../types/tokenBalance.types";

const BALANCE_TTL_SECONDS = 60;
const MAX_TOKEN_CONCURRENCY = 8;
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

export interface TokenBalanceRequest {
  chainId: number;
  tokenAddress: string;
}

function findNetwork(
  chainId: number,
  networks: RpcNetworkConfig[]
): RpcNetworkConfig | undefined {
  return networks.find((network) => network.chainId === chainId);
}

async function updateRawBalanceCache(
  walletAddress: string,
  chainId: number,
  tokenAddress: string,
  rawBalance: string
): Promise<void> {
  const key = `wallet:tokens:v4:${chainId}:${walletAddress.toLowerCase()}`;
  const cached = await redis.get(key);

  let balances: Record<string, { rawBalance: string }> = {};

  if (cached) {
    try {
      const parsed: unknown = JSON.parse(cached);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        balances = parsed as Record<string, { rawBalance: string }>;
      }
    } catch {
      // Replace malformed cache data with a valid raw-balance object.
    }
  }

  // Update only this token; retain every other token entry.
  balances[tokenAddress.toLowerCase()] = { rawBalance };

  await redis.set(key, JSON.stringify(balances), {
    EX: BALANCE_TTL_SECONDS,
  });
}

async function readTokenBalance(
  walletAddress: string,
  request: TokenBalanceRequest,
  network: RpcNetworkConfig
): Promise<WalletTokenBalance> {
  const provider = new JsonRpcProvider(network.rpcUrl, network.chainId);

  try {
    const actualNetwork = await provider.getNetwork();
    if (Number(actualNetwork.chainId) !== request.chainId) {
      throw new Error(`RPC chain ID mismatch for chain ${request.chainId}`);
    }

    const token = new Contract(request.tokenAddress, ERC20_ABI, provider);
    const rawBalanceValue = await token.balanceOf(walletAddress);
    const rawBalance = rawBalanceValue.toString();

    await updateRawBalanceCache(
      walletAddress,
      request.chainId,
      request.tokenAddress,
      rawBalance
    );

    const metadata = await getTokenMetadata(request.tokenAddress, provider);

    return {
      chainId: request.chainId,
      tokenAddress: request.tokenAddress,
      rawBalance,
      formattedBalance: formatTokenBalance(rawBalance, metadata.decimals),
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
    };
  } finally {
    provider.destroy();
  }
}

export async function getSingleTokenBalance(
  walletAddress: string,
  request: TokenBalanceRequest,
  sessionId: string
): Promise<WalletTokenBalance> {
  const configuration = await getSessionRpcNetworksByType(sessionId);
  const network = findNetwork(request.chainId, [
    ...configuration.mainnet,
    ...configuration.testnet,
  ]);

  if (!network) {
    throw new Error(`Chain ID ${request.chainId} is not selected in this session`);
  }

  return readTokenBalance(walletAddress, request, network);
}

export async function getMultipleTokenBalances(
  walletAddress: string,
  requests: TokenBalanceRequest[],
  sessionId: string
): Promise<WalletTokenBalance[]> {
  const configuration = await getSessionRpcNetworksByType(sessionId);
  const networks = [...configuration.mainnet, ...configuration.testnet];

  const results = await mapWithConcurrency(
    requests,
    MAX_TOKEN_CONCURRENCY,
    async (request) => {
      const network = findNetwork(request.chainId, networks);
      if (!network) {
        throw new Error(
          `Chain ID ${request.chainId} is not selected in this session`
        );
      }

      return readTokenBalance(walletAddress, request, network);
    }
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    const firstFailure = failures[0];
    throw new Error(
      firstFailure.status === "rejected" && firstFailure.reason instanceof Error
        ? firstFailure.reason.message
        : "One or more token balance requests failed"
    );
  }

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : ({} as WalletTokenBalance)
  );
}
