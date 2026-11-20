export interface EtherscanTokenTransfer {
  hash: string;
  logIndex: string;
  timeStamp: string;
  [key: string]: unknown;
}

export interface TokenTransfer extends EtherscanTokenTransfer {
  date: string;
}

export async function getRecentERC20Transfers(
  walletAddress: string,
  chainId: number
): Promise<TokenTransfer[]> {
  const params = new URLSearchParams({
    chainid: String(chainId),
    module: "account",
    action: "tokentx",
    address: walletAddress,
    page: "1",
    offset: "100",
    sort: "desc",
    apikey: process.env.ETHERSCAN_API_KEY ?? "",
  });

  const response = await fetch(`https://api.etherscan.io/v2/api?${params}`);
  if (!response.ok) {
    throw new Error(`Etherscan HTTP error: ${response.status}`);
  }

  const payload = await response.json() as {
    status?: string;
    message?: string;
    result?: EtherscanTokenTransfer[] | string;
  };

  if (!Array.isArray(payload.result)) {
    throw new Error(
      typeof payload.result === "string"
        ? payload.result
        : payload.message ?? "Etherscan returned an invalid response"
    );
  }

  return payload.result.map((transfer) => ({
    ...transfer,
    date: new Date(Number(transfer.timeStamp) * 1000).toISOString(),
  }));
}
