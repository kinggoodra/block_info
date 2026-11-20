import {
  getRecentERC20Transfers,
  TokenTransfer,
} from "./etherscanTransfers.service";

const POLLING_INTERVAL_MS = 10_000;

function getTransferId(transfer: TokenTransfer): string {
  return `${transfer.hash}-${transfer.logIndex}`;
}

interface TransferMonitor {
  initialTransfers: TokenTransfer[];
  stop: () => void;
}

export async function startTransferMonitor(
  walletAddress: string,
  chainId: number,
  onUpdate: (transfers: TokenTransfer[]) => void,
  onError: (error: unknown) => void
): Promise<TransferMonitor> {
  const initialTransfers = await getRecentERC20Transfers(
    walletAddress,
    chainId
  );

  let knownTransferIds = new Set(
    initialTransfers.map(getTransferId)
  );
  let isPolling = false;

  const timer = setInterval(async () => {
    if (isPolling) return;

    isPolling = true;

    try {
      const latestTransfers = await getRecentERC20Transfers(
        walletAddress,
        chainId
      );

      const newTransfers = latestTransfers.filter(
        (transfer) => !knownTransferIds.has(getTransferId(transfer))
      );

      knownTransferIds = new Set(latestTransfers.map(getTransferId));

      if (newTransfers.length > 0) {
        onUpdate(newTransfers);
      }
    } catch (error) {
      onError(error);
    } finally {
      isPolling = false;
    }
  }, POLLING_INTERVAL_MS);

  return {
    initialTransfers,
    stop: () => clearInterval(timer),
  };
}
