import { Request, Response } from "express";
import { isAddress } from "ethers";
import { getExistingSessionId } from "../utils/session";
import { getWalletTokenBalances } from "../services/tokenBalance.service";

export async function tokenBalancesController(
  req: Request,
  res: Response
): Promise<void> {
  const publicAddress: unknown = req.body?.publicAddress;
  if (typeof publicAddress !== "string" || !isAddress(publicAddress)) {
    res.status(400).json({
      success: false,
      error: "Valid publicAddress is required",
    });
    return;
  }

  try {
    const sessionId = await getExistingSessionId(req);
    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "Valid session required. Select networks first.",
      });
      return;
    }

    const result = await getWalletTokenBalances(publicAddress, sessionId);

    if (result.successfulNetworks === 0) {
      res.status(502).json({
        success: false,
        partial: false,
        message: "All selected networks failed",
        data: {
          walletAddress: publicAddress,
          mainnet: result.mainnet,
          testnet: result.testnet,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      partial: result.failedNetworks > 0,
      data: {
        walletAddress: publicAddress,
        mainnet: result.mainnet,
        testnet: result.testnet,
      },
    });
  } catch (error) {
    console.error(
      "Token balance error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch token balances",
    });
  }
}
