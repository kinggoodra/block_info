const T_NETWORKS: Record<number, { rpc: string }> = {
  11155111: { rpc: "https://eth-sepolia.g.alchemy.com/v2/" },
  11155420: { rpc: "https://opt-sepolia.g.alchemy.com/v2/" },
  97: { rpc: "https://bnb-testnet.g.alchemy.com/v2/" },
  80002: { rpc: "https://polygon-amoy.g.alchemy.com/v2/" },
  84532: { rpc: "https://base-sepolia.g.alchemy.com/v2/" },
  421614: { rpc: "https://arb-sepolia.g.alchemy.com/v2/" },
  43113: { rpc: "https://avax-fuji.g.alchemy.com/v2/" },
  59141: { rpc: "https://linea-sepolia.g.alchemy.com/v2/" }
};

export default T_NETWORKS;