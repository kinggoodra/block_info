import { Request, Response } from "express";
import { startTransferMonitor } from "../../../services/transferMonitor/startTransferMonitor/startTransferMonitor.service";
import { initializeSSE, sendSSE } from "../../../utils/sseResponse";
import { getValidatedQuery } from "../getValidatedQuery/getValidatedQuery.controller";

export async function monitorERC20TransfersController(req: Request, res: Response): Promise<void> {
  const query = getValidatedQuery(req);
  if (!query) {
    res.status(400).json({ success: false, error: "Valid walletAddress and chainId are required" });
    return;
  }
  let stopMonitor: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    const monitor = await startTransferMonitor(query.walletAddress, query.chainId,
      (newTransfers) => sendSSE(res, "update", newTransfers),
      (error) => {
        console.error("ERC-20 transfer polling error:", error instanceof Error ? error.message : "Unknown error");
        sendSSE(res, "monitor-error", { message: "Unable to refresh transfers from Etherscan" });
      });
    stopMonitor = monitor.stop;
    initializeSSE(res);
    sendSSE(res, "initial", monitor.initialTransfers.slice(0, 5));
    heartbeat = setInterval(() => { res.write(": heartbeat\n\n"); }, 30_000);
    req.on("close", () => {
      if (heartbeat) clearInterval(heartbeat);
      stopMonitor?.();
    });
  } catch (error) {
    console.error("ERC-20 transfer monitor error:", error instanceof Error ? error.message : "Unknown error");
    if (!res.headersSent) res.status(502).json({ success: false, error: "Failed to start ERC-20 transfer monitoring" });
    else res.end();
  }
}