import { Contract, JsonRpcProvider } from "ethers";
import { getSessionRpcNetworks } from "./rpc-config.service";
import { mapWithConcurrency } from "../utils/concurrency";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

const MAX_CONCURRENCY = 4;

export interface TokenRequest {
  chainId: number;
  tokenContractAddress: string;
}

export async function getERC20Balance(
  walletAddress: string,
  token: TokenRequest,
  networks: Awaited<ReturnType<typeof getSessionRpcNetworks>>
) {
  const network = networks.find(
    (item) => item.chainId === token.chainId
  );

  const provider = new JsonRpcProvider(
    network!.rpcUrl,
    token.chainId
  );

  const tokenContract = new Contract(
    token.tokenContractAddress,
    ERC20_ABI,
    provider
  );

  const rawBalance = (
    await tokenContract.balanceOf(walletAddress)
  ).toString();

  return {
    chainId: token.chainId,
    tokenContractAddress: token.tokenContractAddress,
    rawBalance,
  };
}

export async function getAllERC20Balances(
  walletAddress: string,
  tokens: TokenRequest[],
  sessionId: string
) {
  const networks = await getSessionRpcNetworks(sessionId);

  const results = await mapWithConcurrency(
    tokens,
    MAX_CONCURRENCY,
    (token) =>
      getERC20Balance(walletAddress, token, networks)
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
}
