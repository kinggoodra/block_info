import { Request, Response } from "express";
import { isAddress } from "ethers";
import { registerAddress } from "../services/registerAddress.service";

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
    const result = await registerAddress(publicAddress);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
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
