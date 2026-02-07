import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getBotConfig() {
  const { data, error } = await supabase
    .from("bot_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function telegramApi(token: string, method: string, body?: any) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function sendMessage(token: string, chatId: number, text: string, keyboard?: any) {
  const data: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (keyboard) {
    data.reply_markup = JSON.stringify(keyboard);
  }
  return telegramApi(token, "sendMessage", data);
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  return telegramApi(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || "",
  });
}

async function setupBot(token: string, webhookUrl: string, gameUrl: string, botUsername: string) {
  const results: Record<string, any> = {};

  const whRes = await telegramApi(token, "setWebhook", { url: webhookUrl });
  results.webhook = whRes;

  const cmdRes = await telegramApi(token, "setMyCommands", {
    commands: [
      { command: "start", description: "Start the game" },
      { command: "play", description: "Open G-HEMPIRE" },
      { command: "stats", description: "View your stats" },
      { command: "leaderboard", description: "Top players" },
      { command: "referral", description: "Invite friends & earn" },
      { command: "help", description: "Show help" },
    ],
  });
  results.commands = cmdRes;

  const descRes = await telegramApi(token, "setMyDescription", {
    description:
      "G-HEMPIRE - Build your cannabis farming empire! Grow premium EVO strains, earn GLeaf tokens, stake for rewards and compete on the leaderboard. Powered by TON Blockchain.",
  });
  results.description = descRes;

  const shortDescRes = await telegramApi(token, "setMyShortDescription", {
    short_description: "Cannabis farming empire game on TON Blockchain",
  });
  results.short_description = shortDescRes;

  if (gameUrl) {
    const menuRes = await telegramApi(token, "setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "Play G-HEMPIRE",
        web_app: { url: gameUrl },
      },
    });
    results.menu_button = menuRes;
  }

  await supabase
    .from("bot_config")
    .update({
      bot_token: token,
      bot_username: botUsername,
      game_url: gameUrl,
      webhook_url: webhookUrl,
      is_configured: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  results.config_saved = true;
  return results;
}

async function handleStart(token: string, chatId: number, gameUrl: string, botUsername: string, startParam?: string) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "Play G-HEMPIRE",
          web_app: gameUrl ? { url: gameUrl } : undefined,
          url: gameUrl ? undefined : `https://t.me/${botUsername}`,
        },
      ],
      [{ text: "Buy Gems", callback_data: "buy_gems" }],
      [{ text: "Invite Friends", callback_data: "referral" }],
      [{ text: "Leaderboard", callback_data: "leaderboard" }],
    ],
  };

  const message = `<b>Welcome to G-HEMPIRE!</b>

Build your cannabis farming empire, grow premium strains and earn GLeaf tokens!

<b>What you get to start:</b>
- 1,000 Coins
- 50 Gems
- 4 Garden Plots
- 100 Energy

<b>Features:</b>
- 6 unique EVO seed varieties
- Staking with 0.1% daily rewards
- VIP tiers with bonus multipliers
- TON Blockchain integration
- Referral program

Tap <b>"Play G-HEMPIRE"</b> to start growing!`;

  await sendMessage(token, chatId, message, keyboard);
}

async function handleBuyGems(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "100 Gems - 50 Stars", callback_data: "purchase_gems_100_50" }],
      [{ text: "550 Gems (+50 bonus) - 200 Stars", callback_data: "purchase_gems_550_200" }],
      [{ text: "1,200 Gems (+200 bonus) - 400 Stars", callback_data: "purchase_gems_1200_400" }],
      [{ text: "3,000 Gems (+600 bonus) - 900 Stars", callback_data: "purchase_gems_3000_900" }],
      [{ text: "8,000 Gems (+2,000 bonus) - 2,000 Stars", callback_data: "purchase_gems_8000_2000" }],
      [{ text: "Back", callback_data: "back_main" }],
    ],
  };

  await sendMessage(
    token,
    chatId,
    `<b>Gem Packages</b>\n\nUpgrade your empire with premium gems!\nHigher packs include bonus gems.`,
    keyboard
  );
}

async function handleReferral(token: string, chatId: number, telegramId: number, botUsername: string) {
  const { data: player } = await supabase
    .from("players")
    .select("referral_code, referral_count, referral_earnings")
    .eq("wallet_address", `tg_${telegramId}`)
    .maybeSingle();

  const referralCode = player?.referral_code || "N/A";
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "Share Invite Link",
          url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join G-HEMPIRE and grow your cannabis empire! Get 500 bonus coins!")}`,
        },
      ],
      [{ text: "Back", callback_data: "back_main" }],
    ],
  };

  await sendMessage(
    token,
    chatId,
    `<b>Referral Program</b>\n\nYour referral code: <code>${referralCode}</code>\n\n<b>Rewards per invite:</b>\n- 500 Coins for you and your friend\n- 10 Gems bonus\n- 5 GLeaf per referral\n\n<b>Stats:</b>\nTotal referrals: ${player?.referral_count || 0}\nGLeaf earned: ${player?.referral_earnings || 0}\n\nShare your link to earn more!`,
    keyboard
  );
}

async function handleLeaderboard(token: string, chatId: number) {
  const { data: players } = await supabase
    .from("players")
    .select("username, gleaf, level")
    .order("gleaf", { ascending: false })
    .limit(10);

  let text = "<b>G-HEMPIRE Leaderboard</b>\n\n";

  if (!players || players.length === 0) {
    text += "No players yet. Be the first!";
  } else {
    const medals = ["1st", "2nd", "3rd"];
    players.forEach((p: any, i: number) => {
      const rank = i < 3 ? medals[i] : `${i + 1}th`;
      text += `${rank} <b>${p.username}</b> - ${p.gleaf} GLeaf (Lvl ${p.level})\n`;
    });
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "Back", callback_data: "back_main" }],
    ],
  };

  await sendMessage(token, chatId, text, keyboard);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.replace(/^\/telegram-webhook/, "").split("/").filter(Boolean);

    if (req.method === "POST" && pathSegments[0] === "setup") {
      const body = await req.json();
      const { bot_token, bot_username } = body;

      if (!bot_token) {
        return new Response(
          JSON.stringify({ ok: false, error: "bot_token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const meRes = await telegramApi(bot_token, "getMe");
      if (!meRes.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid bot token", details: meRes }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const username = bot_username || meRes.result.username;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
      const gameUrl = "https://marcone1983.github.io/G-HEMPIRE/";

      const results = await setupBot(bot_token, webhookUrl, gameUrl, username);

      return new Response(
        JSON.stringify({
          ok: true,
          bot: meRes.result,
          setup_results: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const config = await getBotConfig();
      return new Response(
        JSON.stringify({
          status: config?.is_configured ? "configured" : "not_configured",
          bot_username: config?.bot_username || "unknown",
          webhook_url: config?.webhook_url || "",
          game_url: config?.game_url || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = await getBotConfig();
    if (!config?.bot_token) {
      return new Response(
        JSON.stringify({ ok: false, error: "Bot not configured. POST to /setup with bot_token first." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = config.bot_token;
    const gameUrl = config.game_url || "https://marcone1983.github.io/G-HEMPIRE/";
    const botUsername = config.bot_username || "GHempireBot";

    const update = await req.json();

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const telegramId = update.message.from.id;
      const username = update.message.from.username || update.message.from.first_name || "Player";
      const text = update.message.text;

      if (text.startsWith("/start")) {
        const startParam = text.split(" ")[1];
        await handleStart(token, chatId, gameUrl, botUsername, startParam);
      } else if (text === "/help") {
        await sendMessage(
          token,
          chatId,
          `<b>G-HEMPIRE Commands</b>\n\n/start - Start the game\n/play - Open the game\n/stats - Your stats\n/leaderboard - Top players\n/referral - Invite friends\n/help - Show this message`
        );
      } else if (text === "/play") {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "Open G-HEMPIRE",
                web_app: gameUrl ? { url: gameUrl } : undefined,
                url: gameUrl ? undefined : `https://t.me/${botUsername}`,
              },
            ],
          ],
        };
        await sendMessage(token, chatId, "Tap to open the game:", keyboard);
      } else if (text === "/stats") {
        const { data: player } = await supabase
          .from("players")
          .select("*")
          .eq("wallet_address", `tg_${telegramId}`)
          .maybeSingle();

        if (player) {
          await sendMessage(
            token,
            chatId,
            `<b>Your Stats</b>\n\nLevel: ${player.level}\nCoins: ${player.coins}\nGLeaf: ${player.gleaf}\nGems: ${player.gems}\nVIP: ${player.vip_tier}\nDaily Streak: ${player.daily_streak} days`
          );
        } else {
          await sendMessage(token, chatId, "You haven't started playing yet! Use /start to begin.");
        }
      } else if (text === "/leaderboard") {
        await handleLeaderboard(token, chatId);
      } else if (text === "/referral") {
        await handleReferral(token, chatId, telegramId, botUsername);
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const telegramId = cb.from.id;
      const data = cb.data;

      await answerCallbackQuery(token, cb.id);

      if (data === "buy_gems") {
        await handleBuyGems(token, chatId);
      } else if (data === "referral") {
        await handleReferral(token, chatId, telegramId, botUsername);
      } else if (data === "leaderboard") {
        await handleLeaderboard(token, chatId);
      } else if (data === "back_main") {
        await handleStart(token, chatId, gameUrl, botUsername);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
