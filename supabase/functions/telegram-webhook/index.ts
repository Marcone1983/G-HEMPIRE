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
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GAME_URL = Deno.env.get("GAME_URL") || "https://marcone1983.github.io/G-HEMPIRE/";
const BOT_USERNAME = Deno.env.get("TELEGRAM_BOT_USERNAME") || "GHempireBot";

async function sendMessage(chatId: number, text: string, keyboard?: any) {
  const data: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (keyboard) {
    data.reply_markup = JSON.stringify(keyboard);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return res.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
      }),
    }
  );
}

async function handleStart(chatId: number, telegramId: number, username: string, startParam?: string) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "Play G-HEMPIRE",
          web_app: GAME_URL ? { url: GAME_URL } : undefined,
          url: GAME_URL ? undefined : `https://t.me/${BOT_USERNAME}`,
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

  await sendMessage(chatId, message, keyboard);
}

async function handleBuyGems(chatId: number) {
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
    chatId,
    `<b>Gem Packages</b>\n\nUpgrade your empire with premium gems!\nHigher packs include bonus gems.`,
    keyboard
  );
}

async function handleReferral(chatId: number, telegramId: number) {
  const { data: player } = await supabase
    .from("players")
    .select("referral_code, referral_count, referral_earnings")
    .eq("wallet_address", `tg_${telegramId}`)
    .maybeSingle();

  const referralCode = player?.referral_code || "N/A";
  const referralLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;

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
    chatId,
    `<b>Referral Program</b>\n\nYour referral code: <code>${referralCode}</code>\n\n<b>Rewards per invite:</b>\n- 500 Coins for you and your friend\n- 10 Gems bonus\n- 5 GLeaf per referral\n\n<b>Stats:</b>\nTotal referrals: ${player?.referral_count || 0}\nGLeaf earned: ${player?.referral_earnings || 0}\n\nShare your link to earn more!`,
    keyboard
  );
}

async function handleLeaderboard(chatId: number) {
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

  await sendMessage(chatId, text, keyboard);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok", bot: BOT_USERNAME }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const update = await req.json();

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const telegramId = update.message.from.id;
      const username = update.message.from.username || update.message.from.first_name || "Player";
      const text = update.message.text;

      if (text.startsWith("/start")) {
        const startParam = text.split(" ")[1];
        await handleStart(chatId, telegramId, username, startParam);
      } else if (text === "/help") {
        await sendMessage(
          chatId,
          `<b>G-HEMPIRE Commands</b>\n\n/start - Start the game\n/play - Open the game\n/stats - Your stats\n/leaderboard - Top players\n/referral - Invite friends\n/help - Show this message`
        );
      } else if (text === "/play") {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "Open G-HEMPIRE",
                web_app: GAME_URL ? { url: GAME_URL } : undefined,
                url: GAME_URL ? undefined : `https://t.me/${BOT_USERNAME}`,
              },
            ],
          ],
        };
        await sendMessage(chatId, "Tap to open the game:", keyboard);
      } else if (text === "/stats") {
        const { data: player } = await supabase
          .from("players")
          .select("*")
          .eq("wallet_address", `tg_${telegramId}`)
          .maybeSingle();

        if (player) {
          await sendMessage(
            chatId,
            `<b>Your Stats</b>\n\nLevel: ${player.level}\nCoins: ${player.coins}\nGLeaf: ${player.gleaf}\nGems: ${player.gems}\nVIP: ${player.vip_tier}\nDaily Streak: ${player.daily_streak} days`
          );
        } else {
          await sendMessage(chatId, "You haven't started playing yet! Use /start to begin.");
        }
      } else if (text === "/leaderboard") {
        await handleLeaderboard(chatId);
      } else if (text === "/referral") {
        await handleReferral(chatId, telegramId);
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const telegramId = cb.from.id;
      const data = cb.data;

      await answerCallbackQuery(cb.id);

      if (data === "buy_gems") {
        await handleBuyGems(chatId);
      } else if (data === "referral") {
        await handleReferral(chatId, telegramId);
      } else if (data === "leaderboard") {
        await handleLeaderboard(chatId);
      } else if (data === "back_main") {
        await handleStart(chatId, telegramId, cb.from.username || "Player");
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
