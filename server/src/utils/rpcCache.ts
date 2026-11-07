import NodeCache from "node-cache";

const rpcCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120
});

export default rpcCache;