import { Request, Response } from "express";
import { isAddress } from "ethers";
import {
  registerAddress,
  RegisterAddressError,
} from "../services/registerAddress.service";
import { getExistingSessionId } from "../utils/session";

export async function registerAddressController(
  req: Request,
  res: Response
): Promise<void> {
  const publicAddress: unknown = req.body?.publicAddress;

  if (typeof publicAddress !== "string" || !isAddress(publicAddress)) {
    res.status(400).json({
      success: false,
      error: "Valid EVM publicAddress is required",
    });
    return;
  }

  try {
    const sessionId = await getExistingSessionId(req);
    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: "Valid session required. Select networks first.",
      });
      return;
    }

    const result = await registerAddress(publicAddress, sessionId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof RegisterAddressError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error(
      "Register Address Error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    res.status(500).json({
      success: false,
      error: "Unable to allocate RPC URLs",
    });
  }
}
