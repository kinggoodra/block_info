import { Request, Response } from "express";
import { getRpcUrls } from "../services/rpc.service";

function validateChainIds(value: unknown): value is number[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((id) => Number.isSafeInteger(id) && (id as number) > 0);
}

export function getMainnetRpc(req: Request, res: Response): void {
  handleRpcRequest(req, res, "mainnet");
}

export function getTestnetRpc(req: Request, res: Response): void {
  handleRpcRequest(req, res, "testnet");
}

function handleRpcRequest(
  req: Request,
  res: Response,
  networkType: "mainnet" | "testnet"
): void {
  const chainIds: unknown = req.body?.chain_ids;

  if (!validateChainIds(chainIds)) {
    res.status(400).json({ error: "Provide a non-empty chain_ids array of positive integers" });
    return;
  }

  try {
    const rpcurl = getRpcUrls(chainIds, networkType);
    res.status(200).json({ rpcurl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC lookup failed";
    const status = message.startsWith("Unsupported") ? 404 : 500;
    res.status(status).json({ error: message });
  }
}