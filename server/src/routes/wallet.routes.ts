import { Router } from "express";
import {
  tokenBalController,
  tokenBalensController,
} from "../controllers/wallet.controller";

const router = Router();

// Single-token balance endpoint.
router.post("/token-bal", tokenBalController);

// Multi-token balance endpoints. Keep both spellings available for compatibility.
router.post("/token-balens", tokenBalensController);
router.post("/token-balances", tokenBalensController);

export default router;
