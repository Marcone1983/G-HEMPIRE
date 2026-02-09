import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
}

export function validateTelegramWebAppData(
  initData: string,
  botToken: string
): TelegramWebAppData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const computedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      console.error("Hash mismatch");
      return null;
    }

    const authDate = parseInt(params.get("auth_date") || "0");
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime - authDate > 86400) {
      console.error("Data is too old");
      return null;
    }

    const userParam = params.get("user");
    if (!userParam) {
      return null;
    }

    const user: TelegramUser = JSON.parse(userParam);

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: params.get("query_id") || undefined,
      chat_instance: params.get("chat_instance") || undefined,
      chat_type: params.get("chat_type") || undefined,
      start_param: params.get("start_param") || undefined,
    };
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    return null;
  }
}

export function getTelegramUserFromRequest(req: Request, botToken: string): TelegramUser | null {
  const initData = req.headers.get("X-Telegram-Init-Data");

  if (!initData) {
    console.warn("No Telegram initData found in request");
    return null;
  }

  const data = validateTelegramWebAppData(initData, botToken);

  if (!data) {
    console.error("Invalid Telegram initData");
    return null;
  }

  return data.user;
}
