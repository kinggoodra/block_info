import { Contract, JsonRpcProvider } from "ethers";
import { getSessionRpcNetworks } from "../../rpc/getSessionRpcNetworks/getSessionRpcNetworks.service";
import { TokenRequest } from "../types/TokenRequest";

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

export async function getERC20Balance(walletAddress: string, token: TokenRequest, networks: Awaited<ReturnType<typeof getSessionRpcNetworks>>) {
  const network = networks.find((item) => item.chainId === token.chainId);
  const provider = new JsonRpcProvider(network!.rpcUrl, token.chainId);
  const tokenContract = new Contract(token.tokenContractAddress, ERC20_ABI, provider);
  const rawBalance = (await tokenContract.balanceOf(walletAddress)).toString();
  return { chainId: token.chainId, tokenContractAddress: token.tokenContractAddress, rawBalance };
}