import { Request, Response } from "express";
import { isAddress } from "ethers";
import { getRecentERC20Transfers } from "../services/etherscanTransfers.service";
import { startTransferMonitor } from "../services/transferMonitor.service";
import { initializeSSE, sendSSE } from "../utils/sseResponse";

interface TransferQuery {
  walletAddress?: string;
  chainId?: string;
}

function getValidatedQuery(req: Request): {
  walletAddress: string;
  chainId: number;
} | null {
  const { walletAddress, chainId } = req.query as TransferQuery;
  const parsedChainId = Number(chainId);

  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    !chainId ||
    !Number.isSafeInteger(parsedChainId) ||
    parsedChainId <= 0
  ) {
    return null;
  }

  return {
    walletAddress,
    chainId: parsedChainId,
  };
}

export async function getRecentERC20TransfersController(
  req: Request,
  res: Response
): Promise<void> {
  const query = getValidatedQuery(req);

  if (!query) {
    res.status(400).json({
      success: false,
      error: "Valid walletAddress and chainId are required",
    });
    return;
  }

  try {
    const transfers = await getRecentERC20Transfers(
      query.walletAddress,
      query.chainId
    );

    res.status(200).json({
      success: true,
      data: transfers.slice(0, 5),
    });
  } catch (error) {
    console.error(
      "Recent ERC-20 transfers error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    res.status(502).json({
      success: false,
      error: "Failed to fetch ERC-20 transfers from Etherscan",
    });
  }
}

export async function monitorERC20TransfersController(
  req: Request,
  res: Response
): Promise<void> {
  const query = getValidatedQuery(req);

  if (!query) {
    res.status(400).json({
      success: false,
      error: "Valid walletAddress and chainId are required",
    });
    return;
  }

  let stopMonitor: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  try {
    const monitor = await startTransferMonitor(
      query.walletAddress,
      query.chainId,
      (newTransfers) => sendSSE(res, "update", newTransfers),
      (error) => {
        console.error(
          "ERC-20 transfer polling error:",
          error instanceof Error ? error.message : "Unknown error"
        );
        sendSSE(res, "monitor-error", {
          message: "Unable to refresh transfers from Etherscan",
        });
      }
    );

    stopMonitor = monitor.stop;
    initializeSSE(res);
    sendSSE(res, "initial", monitor.initialTransfers.slice(0, 5));

    heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 30_000);

    req.on("close", () => {
      if (heartbeat) clearInterval(heartbeat);
      stopMonitor?.();
    });
  } catch (error) {
    console.error(
      "ERC-20 transfer monitor error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: "Failed to start ERC-20 transfer monitoring",
      });
    } else {
      res.end();
    }
  }
}
