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

const CROPS: Record<string, any> = {
  evo_kush: {
    name: "EVO KUSH",
    cost: 100,
    time: 3600,
    reward: 200,
    gleaf: 1,
    rarity: "common",
    level: 1,
    seed_image: "seed_evo_kush.png",
  },
  evo_cheese: {
    name: "EVO-CHEESE",
    cost: 500,
    time: 7200,
    reward: 1200,
    gleaf: 5,
    rarity: "uncommon",
    level: 3,
    seed_image: "seed_evo_cheese.png",
  },
  evo_skunk: {
    name: "EVO-SKUNK",
    cost: 2000,
    time: 14400,
    reward: 5000,
    gleaf: 20,
    rarity: "rare",
    level: 5,
    seed_image: "seed_evo_skunk.png",
  },
  evo_og: {
    name: "EVO-OG",
    cost: 8000,
    time: 28800,
    reward: 22000,
    gleaf: 80,
    rarity: "epic",
    level: 8,
    seed_image: "seed_evo_og.png",
  },
  golden_bud: {
    name: "Golden Bud",
    cost: 30000,
    time: 43200,
    reward: 85000,
    gleaf: 300,
    rarity: "legendary",
    level: 12,
    seed_image: "seed_evo_og.png",
  },
  moon_rocks: {
    name: "Moon Rocks",
    cost: 100000,
    time: 86400,
    reward: 300000,
    gleaf: 1000,
    rarity: "mythic",
    level: 15,
    seed_image: "seed_evo_og.png",
  },
};

const SHOP_ITEMS: Record<string, any[]> = {
  boosts: [
    {
      id: "speed_boost",
      name: "Speed Boost 2x",
      description: "Halve growth time for 1 hour",
      price: 50,
      currency: "gems",
      duration: 3600,
      effect: { growth_speed: 2 },
    },
    {
      id: "yield_boost",
      name: "Yield Boost 1.5x",
      description: "50% more coins for 2 hours",
      price: 75,
      currency: "gems",
      duration: 7200,
      effect: { yield_multiplier: 1.5 },
    },
    {
      id: "gleaf_boost",
      name: "GLeaf Boost 2x",
      description: "Double GLeaf earnings for 3 hours",
      price: 100,
      currency: "gems",
      duration: 10800,
      effect: { gleaf_multiplier: 2 },
    },
    {
      id: "energy_refill",
      name: "Energy Refill",
      description: "Instantly restore 100 energy",
      price: 30,
      currency: "gems",
      energy: 100,
    },
  ],
  premium: [
    {
      id: "vip_bronze",
      name: "VIP Bronze",
      description: "5% bonus on all earnings",
      price: 500,
      currency: "gems",
      tier: "bronze",
      bonus: 1.05,
    },
    {
      id: "vip_silver",
      name: "VIP Silver",
      description: "10% bonus on all earnings",
      price: 1500,
      currency: "gems",
      tier: "silver",
      bonus: 1.1,
    },
    {
      id: "vip_gold",
      name: "VIP Gold",
      description: "20% bonus + exclusive crops",
      price: 5000,
      currency: "gems",
      tier: "gold",
      bonus: 1.2,
    },
    {
      id: "vip_diamond",
      name: "VIP Diamond",
      description: "35% bonus + all features",
      price: 15000,
      currency: "gems",
      tier: "diamond",
      bonus: 1.35,
    },
  ],
  cosmetics: [
    {
      id: "neon_garden",
      name: "Neon Garden Theme",
      description: "Cyberpunk garden aesthetic",
      price: 200,
      currency: "gems",
    },
    {
      id: "gold_pots",
      name: "Golden Pots",
      description: "Luxury gold-plated plant pots",
      price: 350,
      currency: "gems",
    },
    {
      id: "crystal_dome",
      name: "Crystal Dome",
      description: "Transparent crystal greenhouse",
      price: 500,
      currency: "gems",
    },
  ],
  nfts: [
    {
      id: "nft_seed_pack",
      name: "Legendary Seed Pack NFT",
      description: "Exclusive seeds with 2x base stats",
      price: 1000,
      currency: "gems",
      blockchain: true,
    },
    {
      id: "nft_golden_plot",
      name: "Golden Plot NFT",
      description: "Premium plot with auto-harvest",
      price: 2500,
      currency: "gems",
      blockchain: true,
    },
    {
      id: "nft_empire_badge",
      name: "Empire Badge NFT",
      description: "Founding member badge + lifetime bonus",
      price: 5000,
      currency: "gems",
      blockchain: true,
    },
  ],
};

const VIP_TIERS: Record<string, { multiplier: number; referral_bonus: number }> = {
  none: { multiplier: 1.0, referral_bonus: 0.05 },
  bronze: { multiplier: 1.05, referral_bonus: 0.08 },
  silver: { multiplier: 1.1, referral_bonus: 0.12 },
  gold: { multiplier: 1.2, referral_bonus: 0.18 },
  diamond: { multiplier: 1.35, referral_bonus: 0.25 },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ detail: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseRoute(url: string): { path: string; segments: string[] } {
  const u = new URL(url);
  const path = u.pathname.replace(/^\/game-api/, "");
  const segments = path.split("/").filter(Boolean);
  return { path, segments };
}

async function getPlayer(walletAddress: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function handleGetPlayer(walletAddress: string) {
  const player = await getPlayer(walletAddress);
  if (!player) return errorResponse("Player not found", 404);

  const now = new Date();
  const lastUpdate = player.last_energy_update
    ? new Date(player.last_energy_update)
    : now;
  const minutesPassed = (now.getTime() - lastUpdate.getTime()) / 60000;
  const energyRegen = Math.floor(minutesPassed);
  const newEnergy = Math.min(
    player.energy + energyRegen,
    player.max_energy
  );

  if (energyRegen > 0) {
    await supabase
      .from("players")
      .update({ energy: newEnergy, last_energy_update: now.toISOString() })
      .eq("id", player.id);
    player.energy = newEnergy;
    player.last_energy_update = now.toISOString();
  }

  return jsonResponse(player);
}

async function handleCreatePlayer(body: any) {
  const { wallet_address, referrer_id, username } = body;

  const existing = await getPlayer(wallet_address);
  if (existing) return jsonResponse(existing);

  const playerName =
    username ||
    `Grower_${Math.random().toString(36).substring(2, 8)}`;

  let bonusCoins = 0;
  let bonusGems = 0;

  if (referrer_id) {
    const referrer = await supabase
      .from("players")
      .select("id, referral_count")
      .eq("referral_code", referrer_id)
      .maybeSingle();

    if (referrer.data) {
      bonusCoins = 500;
      bonusGems = 10;
      await supabase
        .from("players")
        .update({
          referral_count: (referrer.data.referral_count || 0) + 1,
          last_active: new Date().toISOString(),
        })
        .eq("id", referrer.data.id);
    }
  }

  const referralCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: newPlayer, error } = await supabase
    .from("players")
    .insert({
      wallet_address,
      username: playerName,
      coins: 1000 + bonusCoins,
      gems: 50 + bonusGems,
      referrer_id: referrer_id || null,
      referral_code: referralCode,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  const plots = [];
  for (let i = 0; i < 6; i++) {
    plots.push({
      player_id: newPlayer.id,
      slot: i,
      unlocked: i < 4,
      unlock_cost: i < 4 ? 0 : 1000 * (i - 3),
    });
  }

  await supabase.from("plots").insert(plots);

  return jsonResponse(newPlayer);
}

async function handleGetGarden(playerId: string) {
  const { data: plots, error } = await supabase
    .from("plots")
    .select("*")
    .eq("player_id", playerId)
    .order("slot");

  if (error) return errorResponse(error.message, 500);

  const now = new Date();
  const processedPlots = (plots || []).map((plot: any) => {
    if (plot.ready_at) {
      const readyAt = new Date(plot.ready_at);
      plot.is_ready = now >= readyAt;
      plot.time_remaining = plot.is_ready
        ? 0
        : Math.max(0, Math.floor((readyAt.getTime() - now.getTime()) / 1000));
    } else {
      plot.time_remaining = 0;
    }
    return plot;
  });

  return jsonResponse({ plots: processedPlots, crops: CROPS });
}

async function handlePlant(body: any) {
  const { player_id, slot, crop_type } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);

  const crop = CROPS[crop_type];
  if (!crop) return errorResponse("Invalid crop type");
  if (player.level < crop.level)
    return errorResponse(`Level ${crop.level} required`);
  if (player.coins < crop.cost) return errorResponse("Insufficient coins");
  if (player.energy < 10) return errorResponse("Insufficient energy");

  const { data: plot } = await supabase
    .from("plots")
    .select("*")
    .eq("player_id", player_id)
    .eq("slot", slot)
    .maybeSingle();

  if (!plot) return errorResponse("Plot not found", 404);
  if (!plot.unlocked) return errorResponse("Plot is locked");
  if (plot.crop_type) return errorResponse("Plot already has a crop");

  let growthTime = crop.time;
  for (const boost of player.active_boosts || []) {
    if (boost?.effect?.growth_speed) {
      growthTime = Math.floor(growthTime / boost.effect.growth_speed);
    }
  }

  const now = new Date();
  const readyAt = new Date(now.getTime() + growthTime * 1000);

  await supabase
    .from("plots")
    .update({
      crop_type,
      planted_at: now.toISOString(),
      ready_at: readyAt.toISOString(),
      is_ready: false,
    })
    .eq("player_id", player_id)
    .eq("slot", slot);

  await supabase
    .from("players")
    .update({
      coins: player.coins - crop.cost,
      energy: player.energy - 10,
      xp: player.xp + 10,
      last_active: now.toISOString(),
    })
    .eq("id", player_id);

  return jsonResponse({
    success: true,
    message: `Planted ${crop.name}`,
    ready_at: readyAt.toISOString(),
    growth_time: growthTime,
  });
}

async function handleHarvest(body: any) {
  const { player_id, slot } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);

  const { data: plot } = await supabase
    .from("plots")
    .select("*")
    .eq("player_id", player_id)
    .eq("slot", slot)
    .maybeSingle();

  if (!plot) return errorResponse("Plot not found", 404);
  if (!plot.crop_type) return errorResponse("No crop to harvest");

  const now = new Date();
  const readyAt = new Date(plot.ready_at);
  if (now < readyAt) return errorResponse("Crop not ready yet");

  const crop = CROPS[plot.crop_type];
  const vipMultiplier =
    VIP_TIERS[player.vip_tier || "none"]?.multiplier || 1.0;
  const coinReward = Math.floor(crop.reward * vipMultiplier);
  const gleafReward = Math.floor(crop.gleaf * vipMultiplier);

  let newXp = player.xp + 25;
  let newLevel = player.level;
  let xpNeeded = newLevel * 100;
  while (newXp >= xpNeeded) {
    newXp -= xpNeeded;
    newLevel++;
    xpNeeded = newLevel * 100;
  }

  await supabase
    .from("plots")
    .update({
      crop_type: null,
      planted_at: null,
      ready_at: null,
      is_ready: false,
    })
    .eq("player_id", player_id)
    .eq("slot", slot);

  await supabase
    .from("players")
    .update({
      coins: player.coins + coinReward,
      gleaf: player.gleaf + gleafReward,
      total_earned: player.total_earned + coinReward,
      xp: newXp,
      level: newLevel,
      last_active: now.toISOString(),
    })
    .eq("id", player_id);

  return jsonResponse({
    success: true,
    rewards: { coins: coinReward, gleaf: gleafReward, xp: 25 },
    level_up: newLevel > player.level,
    new_level: newLevel,
  });
}

async function handleGetShop() {
  return jsonResponse(SHOP_ITEMS);
}

async function handlePurchase(body: any) {
  const { player_id, item_id, category } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);

  const categoryItems = SHOP_ITEMS[category] || [];
  const item = categoryItems.find((i: any) => i.id === item_id);
  if (!item) return errorResponse("Item not found", 404);

  if (player.gems < item.price) return errorResponse("Insufficient gems");

  const updates: any = {
    gems: player.gems - item.price,
    last_active: new Date().toISOString(),
  };

  if (category === "boosts" && item.duration) {
    const expiresAt = new Date(Date.now() + item.duration * 1000);
    const boosts = [...(player.active_boosts || [])];
    boosts.push({
      id: item.id,
      name: item.name,
      effect: item.effect || {},
      expires_at: expiresAt.toISOString(),
    });
    updates.active_boosts = boosts;
  } else if (category === "boosts" && item.energy) {
    updates.energy = Math.min(player.energy + item.energy, player.max_energy);
  } else if (category === "premium") {
    updates.vip_tier = item.tier;
    updates.total_spent = player.total_spent + item.price;
  } else if (category === "cosmetics" || category === "nfts") {
    const owned = [...(player.owned_items || [])];
    if (!owned.includes(item.id)) owned.push(item.id);
    updates.owned_items = owned;
  }

  await supabase.from("players").update(updates).eq("id", player_id);

  return jsonResponse({ success: true, message: `Purchased ${item.name}`, item });
}

async function handleGetStaking(playerId: string) {
  const player = await getPlayerById(playerId);
  if (!player) return errorResponse("Player not found", 404);

  const { data: staking } = await supabase
    .from("staking")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (!staking) {
    return jsonResponse({
      player_id: playerId,
      staked_amount: 0,
      daily_reward: 0,
      accumulated_rewards: 0,
      available_gleaf: player.gleaf || 0,
    });
  }

  let accumulated = staking.accumulated_rewards || 0;
  if (staking.last_claim && staking.staked_amount > 0) {
    const lastClaim = new Date(staking.last_claim);
    const daysPassed =
      (Date.now() - lastClaim.getTime()) / (1000 * 86400);
    const dailyRate = 0.001;
    const vipBonus =
      VIP_TIERS[player.vip_tier || "none"]?.multiplier || 1.0;
    accumulated += staking.staked_amount * dailyRate * daysPassed * vipBonus;
  }

  return jsonResponse({
    player_id: playerId,
    staked_amount: staking.staked_amount || 0,
    daily_reward: (staking.staked_amount || 0) * 0.001,
    accumulated_rewards: accumulated,
    available_gleaf: player.gleaf || 0,
    stake_start: staking.stake_start,
  });
}

async function handleStake(body: any) {
  const { player_id, amount } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);
  if (player.gleaf < amount) return errorResponse("Insufficient GLeaf");
  if (amount < 100) return errorResponse("Minimum stake is 100 GLeaf");

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("staking")
    .select("*")
    .eq("player_id", player_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("staking")
      .update({
        staked_amount: existing.staked_amount + amount,
        last_claim: now,
      })
      .eq("player_id", player_id);
  } else {
    await supabase.from("staking").insert({
      player_id,
      staked_amount: amount,
      accumulated_rewards: 0,
      last_claim: now,
      stake_start: now,
    });
  }

  await supabase
    .from("players")
    .update({
      gleaf: player.gleaf - amount,
      total_staked: player.total_staked + amount,
      last_active: now,
    })
    .eq("id", player_id);

  return jsonResponse({ success: true, staked: amount });
}

async function handleClaimStaking(playerId: string) {
  const player = await getPlayerById(playerId);
  if (!player) return errorResponse("Player not found", 404);

  const { data: staking } = await supabase
    .from("staking")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (!staking || !staking.staked_amount) return errorResponse("No staking found");

  let accumulated = staking.accumulated_rewards || 0;
  if (staking.last_claim && staking.staked_amount > 0) {
    const lastClaim = new Date(staking.last_claim);
    const daysPassed = (Date.now() - lastClaim.getTime()) / (1000 * 86400);
    const vipBonus = VIP_TIERS[player.vip_tier || "none"]?.multiplier || 1.0;
    accumulated += staking.staked_amount * 0.001 * daysPassed * vipBonus;
  }

  const rewards = Math.floor(accumulated);
  if (rewards < 1) return errorResponse("No rewards to claim");

  const now = new Date().toISOString();
  await supabase
    .from("staking")
    .update({ accumulated_rewards: 0, last_claim: now })
    .eq("player_id", playerId);

  await supabase
    .from("players")
    .update({ gleaf: player.gleaf + rewards })
    .eq("id", playerId);

  return jsonResponse({ success: true, claimed: rewards });
}

async function handleDailyReward(body: any) {
  const { player_id } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (player.last_daily_claim) {
    const lastDate = new Date(player.last_daily_claim)
      .toISOString()
      .slice(0, 10);
    if (lastDate === today) return errorResponse("Already claimed today");
  }

  let newStreak = 1;
  if (player.last_daily_claim) {
    const yesterday = new Date(now.getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    const lastDate = new Date(player.last_daily_claim)
      .toISOString()
      .slice(0, 10);
    if (lastDate === yesterday) {
      newStreak = (player.daily_streak || 0) + 1;
    }
  }

  const multiplier = Math.min(1 + newStreak * 0.1, 3.0);
  const rewards = {
    coins: Math.floor(100 * multiplier),
    gleaf: Math.floor(1 * multiplier),
    gems: Math.floor(5 * multiplier),
  };

  await supabase
    .from("players")
    .update({
      coins: player.coins + rewards.coins,
      gleaf: player.gleaf + rewards.gleaf,
      gems: player.gems + rewards.gems,
      daily_streak: newStreak,
      last_daily_claim: now.toISOString(),
      last_active: now.toISOString(),
    })
    .eq("id", player_id);

  return jsonResponse({ success: true, streak: newStreak, rewards });
}

async function handleGetReferrals(playerId: string) {
  const player = await getPlayerById(playerId);
  if (!player) return errorResponse("Player not found", 404);

  const { data: referrals } = await supabase
    .from("players")
    .select("username, level, created_at")
    .eq("referrer_id", player.referral_code)
    .limit(100);

  const vipBonus =
    VIP_TIERS[player.vip_tier || "none"]?.referral_bonus || 0.05;

  return jsonResponse({
    referral_code: player.referral_code,
    referral_count: player.referral_count || 0,
    referral_earnings: player.referral_earnings || 0,
    bonus_rate: vipBonus,
    referrals: referrals || [],
  });
}

async function handleGetLeaderboard() {
  const { data: players } = await supabase
    .from("players")
    .select("username, wallet_address, gleaf, level, vip_tier")
    .order("gleaf", { ascending: false })
    .limit(50);

  const leaderboard = (players || []).map((p: any, i: number) => ({
    rank: i + 1,
    username: p.username || "Anonymous",
    wallet_address:
      p.wallet_address.slice(0, 8) + "..." + p.wallet_address.slice(-4),
    gleaf: p.gleaf || 0,
    level: p.level || 1,
    vip_tier: p.vip_tier || "none",
  }));

  return jsonResponse(leaderboard);
}

async function handleWithdraw(body: any) {
  const { player_id, amount, currency } = body;

  const player = await getPlayerById(player_id);
  if (!player) return errorResponse("Player not found", 404);

  if (currency === "gleaf") {
    if (player.gleaf < amount) return errorResponse("Insufficient GLeaf");
    if (amount < 100) return errorResponse("Minimum withdrawal is 100 GLeaf");
  }

  const { data: withdrawal } = await supabase
    .from("withdrawals")
    .insert({
      player_id,
      wallet_address: player.wallet_address,
      amount,
      currency: currency || "gleaf",
    })
    .select()
    .single();

  const updateField = currency === "gleaf" ? "gleaf" : "coins";
  const currentVal = currency === "gleaf" ? player.gleaf : player.coins;
  await supabase
    .from("players")
    .update({
      [updateField]: currentVal - amount,
      last_active: new Date().toISOString(),
    })
    .eq("id", player_id);

  return jsonResponse({
    success: true,
    withdrawal_id: withdrawal?.id,
    status: "pending",
    message: "Withdrawal request submitted",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { path, segments } = parseRoute(req.url);
    const method = req.method;

    if (method === "GET" && segments[0] === "api" && segments[1] === "player" && segments[2]) {
      return await handleGetPlayer(segments[2]);
    }

    if (method === "POST" && path === "/api/player") {
      const body = await req.json();
      return await handleCreatePlayer(body);
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "garden" && segments[2]) {
      return await handleGetGarden(segments[2]);
    }

    if (method === "POST" && path === "/api/garden/plant") {
      const body = await req.json();
      return await handlePlant(body);
    }

    if (method === "POST" && path === "/api/garden/harvest") {
      const body = await req.json();
      return await handleHarvest(body);
    }

    if (method === "GET" && path === "/api/shop") {
      return await handleGetShop();
    }

    if (method === "POST" && path === "/api/shop/purchase") {
      const body = await req.json();
      return await handlePurchase(body);
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "staking" && segments[2]) {
      return await handleGetStaking(segments[2]);
    }

    if (method === "POST" && path === "/api/staking/stake") {
      const body = await req.json();
      return await handleStake(body);
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "staking" && segments[2] === "claim") {
      const url = new URL(req.url);
      const playerId = url.searchParams.get("player_id") || "";
      return await handleClaimStaking(playerId);
    }

    if (method === "POST" && path === "/api/rewards/daily") {
      const body = await req.json();
      return await handleDailyReward(body);
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "referrals" && segments[2]) {
      return await handleGetReferrals(segments[2]);
    }

    if (method === "GET" && path === "/api/leaderboard") {
      return await handleGetLeaderboard();
    }

    if (method === "POST" && path === "/api/wallet/withdraw") {
      const body = await req.json();
      return await handleWithdraw(body);
    }

    if (method === "GET" && path === "/api") {
      return jsonResponse({
        message: "G-HEMPIRE Game API v1.0",
        status: "operational",
      });
    }

    return errorResponse("Not found", 404);
  } catch (err: any) {
    return errorResponse(err.message || "Internal server error", 500);
  }
});
