import { Request, Response } from "express";
import { getRecentERC20Transfers } from "../../../services/etherscanTransfers/getRecentERC20Transfers/getRecentERC20Transfers.service";
import { getValidatedQuery } from "../getValidatedQuery/getValidatedQuery.controller";

export async function getRecentERC20TransfersController(req: Request, res: Response): Promise<void> {
  const query = getValidatedQuery(req);
  if (!query) {
    res.status(400).json({ success: false, error: "Valid walletAddress and chainId are required" });
    return;
  }
  try {
    const transfers = await getRecentERC20Transfers(query.walletAddress, query.chainId);
    res.status(200).json({ success: true, data: transfers.slice(0, 5) });
  } catch (error) {
    console.error("Recent ERC-20 transfers error:", error instanceof Error ? error.message : "Unknown error");
    res.status(502).json({ success: false, error: "Failed to fetch ERC-20 transfers from Etherscan" });
  }
}