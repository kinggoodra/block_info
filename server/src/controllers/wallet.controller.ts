import { Request, Response } from "express";
import { isAddress } from "ethers";
import { getExistingSessionId } from "../utils/session";
import { getWalletTokenBalances } from "../services/tokenBalance.service";
import {
  getAllERC20Balances,
  getERC20Balance,
  TokenRequest,
} from "../services/erc20Balance.service";
import { getSessionRpcNetworks } from "../services/rpc-config.service";

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

export async function erc20BalanceAllController(
  req: Request,
  res: Response
): Promise<void> {
  const sessionId = req.headers.session_id as string;
  const { walletAddress, tokens } = req.body;

  const rawBalances = await getAllERC20Balances(
    walletAddress,
    tokens as TokenRequest[],
    sessionId
  );

  res.json(rawBalances);
}

export async function erc20BalanceController(
  req: Request,
  res: Response
): Promise<void> {
  const sessionId = req.headers.session_id as string;
  const { walletAddress, chainId, tokenContractAddress } = req.body;

  const networks = await getSessionRpcNetworks(sessionId);

  const { rawBalance } = await getERC20Balance(
    walletAddress,
    { chainId, tokenContractAddress },
    networks
  );

  res.json({ rawBalance });
}
