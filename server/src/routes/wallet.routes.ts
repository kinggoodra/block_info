import { Router } from "express";
import {
  tokenBalancesController,
  tokenBalController,
  tokenBalensController,
} from "../controllers/wallet.controller";

const router = Router();

router.post("/token-bal", tokenBalController);
router.post("/token-balens", tokenBalensController);
router.post("/token-balances", tokenBalancesController);

export default router;
