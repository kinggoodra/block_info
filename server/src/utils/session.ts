import { randomUUID } from "crypto";
import { Request } from "express";
import redis from "./redis";

const SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;

    const cookieName = cookie.slice(0, separatorIndex).trim();
    if (cookieName !== name) continue;

    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Reuses an active browser session or creates an ID for the network-selection
 * endpoints. The caller is responsible for setting the cookie after success.
 */
export async function getOrCreateSessionId(req: Request): Promise<string> {
  const existingSessionId = getCookieValue(req, "sessionId");

  if (
    existingSessionId &&
    SESSION_ID_REGEX.test(existingSessionId) &&
    (await redis.exists(`session:${existingSessionId}`))
  ) {
    return existingSessionId;
  }

  return randomUUID();
}

/**
 * Returns only an already-established session. Registration must not create
 * a new session because it needs the network preferences saved by the
 * mainnet/testnet selection endpoints.
 */
export async function getExistingSessionId(
  req: Request
): Promise<string | null> {
  const sessionId = getCookieValue(req, "sessionId");

  if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
    return null;
  }

  const sessionExists = await redis.exists(`session:${sessionId}`);
  return sessionExists ? sessionId : null;
}
