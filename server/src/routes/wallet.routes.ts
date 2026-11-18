import { Router } from "express";
import {
  tokenBalancesController,
  erc20BalanceAllController,
} from "../controllers/wallet.controller";

const router = Router();

router.post("/token-balances", tokenBalancesController);
router.post("/erc20-balance-all", erc20BalanceAllController);

export default router;
