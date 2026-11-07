import { Router } from "express";
import { getTestnetRpc } from "../controllers/rpc.controller";

const router = Router();
router.post("/", getTestnetRpc);

export default router;