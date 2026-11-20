import { TokenTransfer } from "../../etherscanTransfers/types/transfer.types";
export function getTransferId(transfer: TokenTransfer): string { return `${transfer.hash}-${transfer.logIndex}`; }