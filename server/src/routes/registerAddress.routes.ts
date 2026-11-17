import { Router } from "express";
import { registerAddressController } from "../controllers/registerAddress.controller";

const router = Router();

router.post("/Register_Address", registerAddressController);

export default router;
