import { Router } from "express";
import { getMainnetRpc } from "../controllers/rpc/mainnet/mainnet.controller";
const router = Router();
router.post("/", getMainnetRpc);
export default router;