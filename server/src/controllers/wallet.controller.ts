import { Request, Response } from "express";
import { isAddress } from "ethers";
import { getExistingSessionId } from "../utils/session";
import {
  getSingleTokenBalance,
  getMultipleTokenBalances,
  TokenBalanceRequest,
} from "../services/tokenBalance.service";

function isValidTokenRequest(value: unknown): value is TokenBalanceRequest {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.chainId) &&
    (item.chainId as number) > 0 &&
    typeof item.tokenAddress === "string" &&
    isAddress(item.tokenAddress)
  );
}

async function getSession(req: Request, res: Response): Promise<string | null> {
  const sessionId = await getExistingSessionId(req);

  if (!sessionId) {
    res.status(401).json({
      success: false,
      error: "Valid session required. Select networks first.",
    });
    return null;
  }

  return sessionId;
}

export async function tokenBalController(
  req: Request,
  res: Response
): Promise<void> {
  const publicAddress: unknown = req.body?.publicAddress;
  const tokenRequest: unknown = req.body;

  if (
    typeof publicAddress !== "string" ||
    !isAddress(publicAddress) ||
    !isValidTokenRequest(tokenRequest)
  ) {
    res.status(400).json({
      success: false,
      error: "Valid publicAddress, chainId and tokenAddress are required",
    });
    return;
  }

  try {
    const sessionId = await getSession(req, res);
    if (!sessionId) return;

    const data = await getSingleTokenBalance(
      publicAddress,
      tokenRequest,
      sessionId
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(
      "Token balance error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch token balance",
    });
  }
}

export async function tokenBalensController(
  req: Request,
  res: Response
): Promise<void> {
  const publicAddress: unknown = req.body?.publicAddress;
  const tokens: unknown = req.body?.tokens;

  if (
    typeof publicAddress !== "string" ||
    !isAddress(publicAddress) ||
    !Array.isArray(tokens) ||
    tokens.length === 0 ||
    tokens.length > 100 ||
    !tokens.every(isValidTokenRequest)
  ) {
    res.status(400).json({
      success: false,
      error: "Valid publicAddress and 1-100 token entries are required",
    });
    return;
  }

  try {
    const sessionId = await getSession(req, res);
    if (!sessionId) return;

    const data = await getMultipleTokenBalances(
      publicAddress,
      tokens as TokenBalanceRequest[],
      sessionId
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(
      "Multiple token balance error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch token balances",
    });
  }
}
