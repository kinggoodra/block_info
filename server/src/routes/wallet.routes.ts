import { Router } from "express";
import {
  tokenBalController,
  tokenBalensController,
} from "../controllers/wallet.controller";

const router = Router();

router.post("/token-bal", tokenBalController);
router.post("/token-balens", tokenBalensController);

export default router;
