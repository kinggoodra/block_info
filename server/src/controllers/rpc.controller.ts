import { Request, Response } from "express";
import { randomUUID } from "crypto";
import redis from "../utils/redis";
import {
  cacheRpcUrls,
  NetworkType,
  RpcConfigurationError,
  SESSION_TTL_SECONDS,
} from "../services/rpc.service";

const SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;

    const cookieName = cookie.slice(0, separatorIndex).trim();
    if (cookieName !== name) continue;

    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

async function getOrCreateSessionId(req: Request): Promise<string> {
  const existingSessionId = getCookieValue(req, "sessionId");

  if (
    existingSessionId &&
    SESSION_ID_REGEX.test(existingSessionId) &&
    (await redis.exists(`session:${existingSessionId}`))
  ) {
    return existingSessionId;
  }

  return randomUUID();
}

export async function getMainnetRpc(
  req: Request,
  res: Response
): Promise<void> {
  await handleRpcRequest(req, res, "mainnet");
}

export async function getTestnetRpc(
  req: Request,
  res: Response
): Promise<void> {
  await handleRpcRequest(req, res, "testnet");
}

async function handleRpcRequest(
  req: Request,
  res: Response,
  networkType: NetworkType
): Promise<void> {
  const chainIds: unknown = req.body?.chain_ids;

  if (
    !Array.isArray(chainIds) ||
    chainIds.length === 0 ||
    !chainIds.every(
      (id) => Number.isSafeInteger(id) && (id as number) > 0
    )
  ) {
    res.status(400).json({
      success: false,
      message: "chain_ids must be a non-empty array of positive integers",
    });
    return;
  }

  try {
    const sessionId = await getOrCreateSessionId(req);
    const data = await cacheRpcUrls(
      sessionId,
      networkType,
      chainIds as number[]
    );

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS * 1000,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof RpcConfigurationError) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("RPC request error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
