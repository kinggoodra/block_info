import { getSessionRpcNetworks } from "../../rpc/getSessionRpcNetworks/getSessionRpcNetworks.service";
import { getERC20Balance } from "../getERC20Balance/getERC20Balance.service";
import { TokenRequest } from "../types/TokenRequest";
import { mapWithConcurrency } from "../../../utils/concurrency";

const MAX_CONCURRENCY = 4;

export async function getAllERC20Balances(walletAddress: string, tokens: TokenRequest[], sessionId: string) {
  const networks = await getSessionRpcNetworks(sessionId);
  const results = await mapWithConcurrency(tokens, MAX_CONCURRENCY, (token) => getERC20Balance(walletAddress, token, networks));
  return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}