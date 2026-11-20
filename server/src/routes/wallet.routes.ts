import { Router } from "express";
import {
  tokenBalancesController,
  erc20BalanceAllController,
  erc20BalanceController,
} from "../controllers/wallet.controller";
import {
  getRecentERC20TransfersController,
  monitorERC20TransfersController,
} from "../controllers/erc20Transfers.controller";

const router = Router();

router.post("/token-balances", tokenBalancesController);
router.post("/erc20-balance-all", erc20BalanceAllController);
router.post("/erc20-balance", erc20BalanceController);

router.get("/erc20/recent", getRecentERC20TransfersController);
router.get("/erc20/monitor", monitorERC20TransfersController);

export default router;
