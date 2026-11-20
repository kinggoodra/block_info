import { Request, Response } from "express";
import { handleRpcRequest } from "../handleRpcRequest/handleRpcRequest.controller";

export async function getTestnetRpc(req: Request, res: Response): Promise<void> {
  await handleRpcRequest(req, res, "testnet");
}