import { Request, Response } from "express";
import { getERC20Balance } from "../../../services/erc20Balance/getERC20Balance/getERC20Balance.service";
import { getSessionRpcNetworks } from "../../../services/rpc/getSessionRpcNetworks/getSessionRpcNetworks.service";

export async function erc20BalanceController(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers.session_id as string;
  const { walletAddress, chainId, tokenContractAddress } = req.body;
  const networks = await getSessionRpcNetworks(sessionId);
  const { rawBalance } = await getERC20Balance(walletAddress, { chainId, tokenContractAddress }, networks);
  res.json({ rawBalance });
}