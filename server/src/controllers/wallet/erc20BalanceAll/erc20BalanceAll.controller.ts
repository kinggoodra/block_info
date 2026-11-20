import { Request, Response } from "express";
import { getAllERC20Balances } from "../../../services/erc20Balance/getAllERC20Balances/getAllERC20Balances.service";
import { TokenRequest } from "../../../services/erc20Balance/types/TokenRequest";

export async function erc20BalanceAllController(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers.session_id as string;
  const { walletAddress, tokens } = req.body;
  const rawBalances = await getAllERC20Balances(walletAddress, tokens as TokenRequest[], sessionId);
  res.json(rawBalances);
}