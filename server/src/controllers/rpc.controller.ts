import { Request, Response } from "express";
import { getRpcUrls } from "../services/rpc.service";

function validateChainIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 &&
    value.every((id) => Number.isSafeInteger(id) && (id as number) > 0);
}

export async function getMainnetRpc(req: Request, res: Response): Promise<void> {
  await handleRpcRequest(req, res, "mainnet");
}
export async function getTestnetRpc(req: Request, res: Response): Promise<void> {
  await handleRpcRequest(req, res, "testnet");
}

async function handleRpcRequest(req: Request, res: Response, networkType: "mainnet" | "testnet"): Promise<void> {
  const chainIds: unknown = req.body?.chain_ids;
  if (!validateChainIds(chainIds)) {
    res.status(400).json({ error: "Provide a non-empty chain_ids array of positive integers" });
    return;
  }
  try {
    const rpcurl = await getRpcUrls(chainIds, networkType);
    res.status(200).json({ rpcurl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC lookup failed";
    res.status(message.startsWith("Unsupported") ? 404 : 502).json({ error: message });
  }
}