import { Request } from "express";
import { isAddress } from "ethers";

interface TransferQuery { walletAddress?: string; chainId?: string; }

export function getValidatedQuery(req: Request): { walletAddress: string; chainId: number } | null {
  const { walletAddress, chainId } = req.query as TransferQuery;
  const parsedChainId = Number(chainId);
  if (typeof walletAddress !== "string" || !isAddress(walletAddress) || !chainId || !Number.isSafeInteger(parsedChainId) || parsedChainId <= 0) return null;
  return { walletAddress, chainId: parsedChainId };
}