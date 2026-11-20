import { getRecentERC20Transfers } from "../../etherscanTransfers/getRecentERC20Transfers/getRecentERC20Transfers.service";
import { TokenTransfer } from "../../etherscanTransfers/types/transfer.types";
import { TransferMonitor } from "../types/TransferMonitor";
import { getTransferId } from "../getTransferId/getTransferId.service";

const POLLING_INTERVAL_MS = 10_000;

export async function startTransferMonitor(walletAddress: string, chainId: number, onUpdate: (transfers: TokenTransfer[]) => void, onError: (error: unknown) => void): Promise<TransferMonitor> {
  const initialTransfers = await getRecentERC20Transfers(walletAddress, chainId);
  let knownTransferIds = new Set(initialTransfers.map(getTransferId));
  let isPolling = false;
  const timer = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      const latestTransfers = await getRecentERC20Transfers(walletAddress, chainId);
      const newTransfers = latestTransfers.filter((transfer) => !knownTransferIds.has(getTransferId(transfer)));
      knownTransferIds = new Set(latestTransfers.map(getTransferId));
      if (newTransfers.length > 0) onUpdate(newTransfers);
    } catch (error) {
      onError(error);
    } finally {
      isPolling = false;
    }
  }, POLLING_INTERVAL_MS);
  return { initialTransfers, stop: () => clearInterval(timer) };
}