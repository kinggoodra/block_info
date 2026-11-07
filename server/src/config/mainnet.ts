const M_NETWORKS: Record<number, { rpc: string }> = {
  1: { rpc: "https://eth-mainnet.g.alchemy.com/v2/" },
  10: { rpc: "https://opt-mainnet.g.alchemy.com/v2/" },
  56: { rpc: "https://bnb-mainnet.g.alchemy.com/v2/" },
  100: { rpc: "https://gnosis-mainnet.g.alchemy.com/v2/" },
  137: { rpc: "https://polygon-mainnet.g.alchemy.com/v2/" },
  324: { rpc: "https://zksync-mainnet.g.alchemy.com/v2/" },
  8453: { rpc: "https://base-mainnet.g.alchemy.com/v2/" },
  42161: { rpc: "https://arb-mainnet.g.alchemy.com/v2/" },
  43114: { rpc: "https://avax-mainnet.g.alchemy.com/v2/" },
  59144: { rpc: "https://linea-mainnet.g.alchemy.com/v2/" },
  7777777: { rpc: "https://zora-mainnet.g.alchemy.com/v2/" }
};

export default M_NETWORKS;