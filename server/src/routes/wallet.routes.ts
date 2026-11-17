import { Router } from "express";
import { tokenBalancesController } from "../controllers/wallet.controller";

const router = Router();
router.post("/token-balances", tokenBalancesController);

export default router;
