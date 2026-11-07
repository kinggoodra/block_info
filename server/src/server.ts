import express from "express";
import dotenv from "dotenv";
import mainnetRoutes from "./routes/mainnet.routes";
import testnetRoutes from "./routes/testnet.routes";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/mainnet", mainnetRoutes);
app.use("/api/testnet", testnetRoutes);

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`block_info server listening on port ${PORT}`);
});