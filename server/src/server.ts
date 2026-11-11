import "dotenv/config";

import express from "express";
import mainnetRoutes from "./routes/mainnet.routes";
import testnetRoutes from "./routes/testnet.routes";
import registerAddressRoutes from "./routes/registerAddress.routes";
import walletRoutes from "./routes/wallet.routes";
import redis from "./utils/redis";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/mainnet", mainnetRoutes);
app.use("/api/testnet", testnetRoutes);
app.use("/api/rpc", registerAddressRoutes);
app.use("/api/wallet", walletRoutes);

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    console.log("Redis connected successfully");

    app.listen(PORT, () => {
      console.log(`block_info server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
