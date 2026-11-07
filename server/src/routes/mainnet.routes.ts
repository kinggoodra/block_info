import { Router } from "express";
import { getMainnetRpc } from "../controllers/rpc.controller";

const router = Router();
router.post("/", getMainnetRpc);

export default router;