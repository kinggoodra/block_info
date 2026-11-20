import { TokenTransfer } from "../../etherscanTransfers/types/transfer.types";
export interface TransferMonitor { initialTransfers: TokenTransfer[]; stop: () => void; }