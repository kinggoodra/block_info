export interface EtherscanTokenTransfer { hash: string; logIndex: string; timeStamp: string; [key: string]: unknown; }
export interface TokenTransfer extends EtherscanTokenTransfer { date: string; }