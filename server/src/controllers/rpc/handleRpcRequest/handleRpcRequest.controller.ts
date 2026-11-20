import { Request, Response } from "express";
import { cacheRpcUrls } from "../../../services/rpc/cacheRpcUrls/cacheRpcUrls.service";
import { NetworkType, SESSION_TTL_SECONDS, RpcConfigurationError } from "../../../services/rpc/types/rpc.types";
import { getOrCreateSessionId } from "../../../utils/session";

export async function handleRpcRequest(req: Request, res: Response, networkType: NetworkType): Promise<void> {
  const chainIds: unknown = req.body?.chain_ids;
  if (!Array.isArray(chainIds) || chainIds.length === 0 || !chainIds.every((id) => Number.isSafeInteger(id) && (id as number) > 0)) {
    res.status(400).json({ success: false, message: "chain_ids must be a non-empty array of positive integers" });
    return;
  }
  try {
    const sessionId = await getOrCreateSessionId(req);
    const data = await cacheRpcUrls(sessionId, networkType, chainIds as number[]);
    res.cookie("sessionId", sessionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS * 1000 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof RpcConfigurationError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    console.error("RPC request error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}