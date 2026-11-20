import { getSessionRpcNetworksByType } from "../rpc/getSessionRpcNetworksByType/getSessionRpcNetworksByType.service";
import { RegisterAddressError } from "./RegisterAddressError";

interface RegisterAddressResult { publicAddress: string; rpcUrls: { mainnet: { rpcUrl: string }[]; testnet: { rpcUrl: string }[]; }; }

export async function registerAddress(publicAddress: string, sessionId: string): Promise<RegisterAddressResult> {
  const networks = await getSessionRpcNetworksByType(sessionId);
  if (networks.mainnet.length + networks.testnet.length === 0) throw new RegisterAddressError("No networks selected for this session. Select mainnet or testnet networks first.");
  return { publicAddress, rpcUrls: { mainnet: networks.mainnet.map(({ rpcUrl }) => ({ rpcUrl })), testnet: networks.testnet.map(({ rpcUrl }) => ({ rpcUrl })) } };
}