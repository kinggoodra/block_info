import { Router } from "express";
import {
  tokenBalancesController,
  erc20BalanceAllController,
  erc20BalanceController,
} from "../controllers/wallet.controller";

const router = Router();

router.post("/token-balances", tokenBalancesController);
router.post("/erc20-balance-all", erc20BalanceAllController);
router.post("/erc20-balance", erc20BalanceController);

export default router;
