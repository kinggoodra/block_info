import { Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  cacheRpcUrls,
  NetworkType,
  RpcConfigurationError,
} from "../services/rpc.service";

const SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateChainIds(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (id) => Number.isSafeInteger(id) && (id as number) > 0
    )
  );
}

function getOrCreateSessionId(
  req: Request
): { sessionId?: string; error?: string } {
  const existingSessionId = req.get("X-Session-ID");

  if (!existingSessionId) {
    return { sessionId: randomUUID() };
  }

  if (!SESSION_ID_REGEX.test(existingSessionId)) {
    return { error: "Invalid X-Session-ID" };
  }

  return { sessionId: existingSessionId };
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

  if (!validateChainIds(chainIds)) {
    res.status(400).json({
      success: false,
      message: "chain_ids must be a non-empty array of positive integers",
    });
    return;
  }

  const sessionResult = getOrCreateSessionId(req);

  if (!sessionResult.sessionId || sessionResult.error) {
    res.status(400).json({
      success: false,
      message: sessionResult.error,
    });
    return;
  }

  try {
    const data = await cacheRpcUrls(
      sessionResult.sessionId,
      networkType,
      chainIds
    );

    res.status(200).json({
      success: true,
      session_id: sessionResult.sessionId,
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
