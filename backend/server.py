from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import secrets
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_ANON_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Game Configuration
REVENUE_WALLET = os.environ.get('REVENUE_WALLET', 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR')
GLEAF_CONTRACT = os.environ.get('GLEAF_CONTRACT', 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA')
STAKING_CONTRACT = os.environ.get('STAKING_CONTRACT', 'EQBstk4q4G6yk7qVKCN7O6dpFTR9znN1hEaGSAoN1sVRr5l_')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_BOT_USERNAME = os.environ.get('TELEGRAM_BOT_USERNAME')

# Game Constants - EVO Seed Varieties
CROPS = {
    "evo_kush": {"name": "EVO KUSH", "cost": 100, "time": 3600, "reward": 200, "gleaf": 1, "rarity": "common", "level": 1, "seed_image": "seed_evo_kush.png"},
    "evo_cheese": {"name": "EVO-CHEESE", "cost": 500, "time": 7200, "reward": 1200, "gleaf": 5, "rarity": "uncommon", "level": 3, "seed_image": "seed_evo_cheese.png"},
    "evo_skunk": {"name": "EVO-SKUNK", "cost": 2000, "time": 14400, "reward": 5000, "gleaf": 20, "rarity": "rare", "level": 5, "seed_image": "seed_evo_skunk.png"},
    "evo_og": {"name": "EVO-OG", "cost": 8000, "time": 28800, "reward": 22000, "gleaf": 80, "rarity": "epic", "level": 8, "seed_image": "seed_evo_og.png"},
    "golden_bud": {"name": "Golden Bud", "cost": 30000, "time": 43200, "reward": 85000, "gleaf": 300, "rarity": "legendary", "level": 12, "seed_image": "seed_evo_og.png"},
    "moon_rocks": {"name": "Moon Rocks", "cost": 100000, "time": 86400, "reward": 300000, "gleaf": 1000, "rarity": "mythic", "level": 15, "seed_image": "seed_evo_og.png"},
}

SHOP_ITEMS = {
    "boosts": [
        {"id": "speed_boost", "name": "Speed Boost 2x", "description": "Halve growth time for 1 hour", "price": 50, "currency": "gems", "duration": 3600, "effect": {"growth_speed": 2}},
        {"id": "yield_boost", "name": "Yield Boost 1.5x", "description": "50% more coins for 2 hours", "price": 75, "currency": "gems", "duration": 7200, "effect": {"yield_multiplier": 1.5}},
        {"id": "gleaf_boost", "name": "GLeaf Boost 2x", "description": "Double GLeaf earnings for 3 hours", "price": 100, "currency": "gems", "duration": 10800, "effect": {"gleaf_multiplier": 2}},
        {"id": "energy_refill", "name": "Energy Refill", "description": "Instantly restore 100 energy", "price": 30, "currency": "gems", "energy": 100},
    ],
    "premium": [
        {"id": "vip_bronze", "name": "VIP Bronze", "description": "5% bonus on all earnings", "price": 500, "currency": "gems", "tier": "bronze", "bonus": 1.05},
        {"id": "vip_silver", "name": "VIP Silver", "description": "10% bonus on all earnings", "price": 1500, "currency": "gems", "tier": "silver", "bonus": 1.10},
        {"id": "vip_gold", "name": "VIP Gold", "description": "20% bonus + exclusive crops", "price": 5000, "currency": "gems", "tier": "gold", "bonus": 1.20},
        {"id": "vip_diamond", "name": "VIP Diamond", "description": "35% bonus + all features", "price": 15000, "currency": "gems", "tier": "diamond", "bonus": 1.35},
    ],
    "cosmetics": [
        {"id": "neon_garden", "name": "Neon Garden Theme", "description": "Cyberpunk garden aesthetic", "price": 200, "currency": "gems"},
        {"id": "gold_pots", "name": "Golden Pots", "description": "Luxury gold-plated plant pots", "price": 350, "currency": "gems"},
        {"id": "crystal_dome", "name": "Crystal Dome", "description": "Transparent crystal greenhouse", "price": 500, "currency": "gems"},
    ],
    "nfts": [
        {"id": "nft_seed_pack", "name": "Legendary Seed Pack NFT", "description": "Exclusive seeds with 2x base stats", "price": 1000, "currency": "gems", "blockchain": True},
        {"id": "nft_golden_plot", "name": "Golden Plot NFT", "description": "Premium plot with auto-harvest", "price": 2500, "currency": "gems", "blockchain": True},
        {"id": "nft_empire_badge", "name": "Empire Badge NFT", "description": "Founding member badge + lifetime bonus", "price": 5000, "currency": "gems", "blockchain": True},
    ]
}

VIP_TIERS = {
    "none": {"multiplier": 1.0, "referral_bonus": 0.05},
    "bronze": {"multiplier": 1.05, "referral_bonus": 0.08},
    "silver": {"multiplier": 1.10, "referral_bonus": 0.12},
    "gold": {"multiplier": 1.20, "referral_bonus": 0.18},
    "diamond": {"multiplier": 1.35, "referral_bonus": 0.25},
}

# Pydantic Models
class PlayerCreate(BaseModel):
    wallet_address: str
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    referrer_id: Optional[str] = None

class PlantRequest(BaseModel):
    player_id: str
    slot: int
    crop_type: str

class HarvestRequest(BaseModel):
    player_id: str
    slot: int

class PurchaseRequest(BaseModel):
    player_id: str
    item_id: str
    category: str

class StakeRequest(BaseModel):
    player_id: str
    amount: float

class WithdrawRequest(BaseModel):
    player_id: str
    amount: float
    currency: str

class DailyClaimRequest(BaseModel):
    player_id: str

class MatchRequest(BaseModel):
    player1_id: str
    player2_id: str
    entry_fee: int = 100

class FinishMatchRequest(BaseModel):
    match_id: str
    winner_id: str
    winner_coins: int = 500
    winner_gleaf: int = 50

# App Setup
app = FastAPI(title="Cannabis Empire API - Supabase Edition")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper Functions
def calculate_vip_tier(total_spent: float) -> str:
    if total_spent >= 15000:
        return "diamond"
    elif total_spent >= 5000:
        return "gold"
    elif total_spent >= 1500:
        return "silver"
    elif total_spent >= 500:
        return "bronze"
    return "none"

def calculate_daily_streak_bonus(streak: int) -> Dict:
    base_coins = 100
    base_gleaf = 1
    base_gems = 5
    multiplier = min(1 + (streak * 0.1), 3.0)
    return {
        "coins": int(base_coins * multiplier),
        "gleaf": int(base_gleaf * multiplier),
        "gems": int(base_gems * multiplier),
        "multiplier": multiplier
    }

async def update_player_energy(player: Dict) -> Dict:
    now = datetime.now(timezone.utc)
    last_update = player.get('last_energy_update')
    if last_update:
        if isinstance(last_update, str):
            last_update_dt = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
        else:
            last_update_dt = last_update
        minutes_passed = (now - last_update_dt).total_seconds() / 60
        energy_regen = int(minutes_passed)
        player['energy'] = min(player['energy'] + energy_regen, player['max_energy'])
    player['last_energy_update'] = now.isoformat()
    return player

def apply_boosts(player: Dict, base_value: float, boost_type: str) -> float:
    now = datetime.now(timezone.utc)
    multiplier = 1.0
    active_boosts = player.get('active_boosts', [])

    for boost in active_boosts:
        expires_at = datetime.fromisoformat(boost['expires_at'].replace('Z', '+00:00'))
        if expires_at > now:
            if boost_type in boost.get('effect', {}):
                multiplier *= boost['effect'][boost_type]

    vip_multiplier = VIP_TIERS.get(player.get('vip_tier', 'none'), {}).get('multiplier', 1.0)

    return base_value * multiplier * vip_multiplier

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Cannabis Empire API v2.0 - Supabase", "status": "operational"}

@api_router.get("/config")
async def get_config():
    return {
        "crops": CROPS,
        "shop_items": SHOP_ITEMS,
        "vip_tiers": VIP_TIERS,
        "revenue_wallet": REVENUE_WALLET,
        "gleaf_contract": GLEAF_CONTRACT,
        "bot_username": TELEGRAM_BOT_USERNAME
    }

# Player Endpoints
@api_router.post("/player")
async def create_player(data: PlayerCreate):
    # Check if player exists
    existing = supabase.table('players').select('*').eq('wallet_address', data.wallet_address).execute()
    if existing.data:
        return existing.data[0]

    # Generate referral code
    referral_code = secrets.token_hex(6)

    # Create new player
    player_data = {
        "wallet_address": data.wallet_address,
        "telegram_id": data.telegram_id,
        "username": data.username or f"Grower_{secrets.token_hex(3)}",
        "referral_code": referral_code,
        "referrer_id": data.referrer_id,
        "coins": 1000,
        "gleaf": 0,
        "gems": 50
    }

    # Handle referral
    if data.referrer_id:
        referrer = supabase.table('players').select('*').eq('referral_code', data.referrer_id).execute()
        if referrer.data:
            player_data["coins"] += 500
            player_data["gems"] += 10
            # Update referrer
            ref = referrer.data[0]
            supabase.table('players').update({
                "referral_count": ref['referral_count'] + 1,
                "referral_earnings": ref['referral_earnings'] + 100,
                "gleaf": ref['gleaf'] + 5
            }).eq('id', ref['id']).execute()

    result = supabase.table('players').insert(player_data).execute()
    player = result.data[0]

    # Create initial plots (6 slots, first 4 unlocked)
    plots = []
    for i in range(6):
        plots.append({
            "player_id": player['id'],
            "slot": i,
            "unlocked": i < 4,
            "unlock_cost": 0 if i < 4 else (1000 * (i - 3))
        })

    supabase.table('plots').insert(plots).execute()

    return player

@api_router.get("/player/{wallet_address}")
async def get_player(wallet_address: str):
    result = supabase.table('players').select('*').eq('wallet_address', wallet_address).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Player not found")

    player = result.data[0]
    player = await update_player_energy(player)

    supabase.table('players').update({
        "energy": player['energy'],
        "last_energy_update": player['last_energy_update']
    }).eq('wallet_address', wallet_address).execute()

    return player

# Garden Endpoints
@api_router.get("/garden/{player_id}")
async def get_garden(player_id: str):
    plots_result = supabase.table('plots').select('*').eq('player_id', player_id).execute()
    plots = plots_result.data

    now = datetime.now(timezone.utc)
    for plot in plots:
        if plot.get('ready_at'):
            ready_at_str = plot['ready_at']
            if isinstance(ready_at_str, str):
                ready_at = datetime.fromisoformat(ready_at_str.replace('Z', '+00:00'))
            else:
                ready_at = ready_at_str
            plot['is_ready'] = now >= ready_at
            if not plot['is_ready']:
                plot['time_remaining'] = int((ready_at - now).total_seconds())
            else:
                plot['time_remaining'] = 0

    return {"plots": plots, "crops": CROPS}

@api_router.post("/garden/plant")
async def plant_crop(data: PlantRequest):
    # Get player
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    # Get crop info
    crop = CROPS.get(data.crop_type)
    if not crop:
        raise HTTPException(status_code=400, detail="Invalid crop type")

    # Check requirements
    if player['level'] < crop['level']:
        raise HTTPException(status_code=400, detail=f"Level {crop['level']} required")
    if player['coins'] < crop['cost']:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    if player['energy'] < 10:
        raise HTTPException(status_code=400, detail="Insufficient energy")

    # Get plot
    plot_result = supabase.table('plots').select('*').eq('player_id', data.player_id).eq('slot', data.slot).execute()
    if not plot_result.data:
        raise HTTPException(status_code=404, detail="Plot not found")
    plot = plot_result.data[0]

    if not plot['unlocked']:
        raise HTTPException(status_code=400, detail="Plot is locked")
    if plot.get('crop_type'):
        raise HTTPException(status_code=400, detail="Plot already has a crop")

    # Calculate growth time
    growth_time = crop['time']
    now = datetime.now(timezone.utc)
    ready_at = now + timedelta(seconds=growth_time)

    # Update plot
    supabase.table('plots').update({
        "crop_type": data.crop_type,
        "planted_at": now.isoformat(),
        "ready_at": ready_at.isoformat(),
        "is_ready": False
    }).eq('player_id', data.player_id).eq('slot', data.slot).execute()

    # Deduct cost and energy
    supabase.table('players').update({
        "coins": player['coins'] - crop['cost'],
        "energy": player['energy'] - 10,
        "xp": player['xp'] + 10
    }).eq('id', data.player_id).execute()

    return {
        "success": True,
        "message": f"Planted {crop['name']}",
        "ready_at": ready_at.isoformat(),
        "growth_time": growth_time
    }

@api_router.post("/garden/harvest")
async def harvest_crop(data: HarvestRequest):
    # Get player
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    # Get plot
    plot_result = supabase.table('plots').select('*').eq('player_id', data.player_id).eq('slot', data.slot).execute()
    if not plot_result.data:
        raise HTTPException(status_code=404, detail="Plot not found")
    plot = plot_result.data[0]

    if not plot.get('crop_type'):
        raise HTTPException(status_code=400, detail="No crop to harvest")

    # Check if ready
    now = datetime.now(timezone.utc)
    ready_at = datetime.fromisoformat(plot['ready_at'].replace('Z', '+00:00'))
    if now < ready_at:
        raise HTTPException(status_code=400, detail="Crop not ready yet")

    # Get crop info
    crop = CROPS.get(plot['crop_type'])

    # Calculate rewards with boosts
    coin_reward = apply_boosts(player, crop['reward'], 'yield_multiplier')
    gleaf_reward = apply_boosts(player, crop['gleaf'], 'gleaf_multiplier')

    # Level up check
    new_xp = player['xp'] + 25
    new_level = player['level']
    xp_needed = new_level * 100
    while new_xp >= xp_needed:
        new_xp -= xp_needed
        new_level += 1
        xp_needed = new_level * 100

    # Clear plot
    supabase.table('plots').update({
        "crop_type": None,
        "planted_at": None,
        "ready_at": None,
        "is_ready": False
    }).eq('player_id', data.player_id).eq('slot', data.slot).execute()

    # Update player
    supabase.table('players').update({
        "coins": player['coins'] + coin_reward,
        "gleaf": player['gleaf'] + gleaf_reward,
        "total_earned": player['total_earned'] + coin_reward,
        "xp": new_xp,
        "level": new_level
    }).eq('id', data.player_id).execute()

    return {
        "success": True,
        "rewards": {
            "coins": int(coin_reward),
            "gleaf": int(gleaf_reward),
            "xp": 25
        },
        "level_up": new_level > player['level'],
        "new_level": new_level
    }

# Shop Endpoints
@api_router.get("/shop")
async def get_shop():
    return SHOP_ITEMS

@api_router.post("/shop/purchase")
async def purchase_item(data: PurchaseRequest):
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    # Find item
    category_items = SHOP_ITEMS.get(data.category, [])
    item = next((item for item in category_items if item['id'] == data.item_id), None)

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check currency
    if item['currency'] == 'gems' and player['gems'] < item['price']:
        raise HTTPException(status_code=400, detail="Insufficient gems")
    elif item['currency'] == 'coins' and player['coins'] < item['price']:
        raise HTTPException(status_code=400, detail="Insufficient coins")

    now = datetime.now(timezone.utc)
    updates = {}

    # Handle different item types
    if data.category == "boosts":
        if item.get('duration'):
            expires_at = now + timedelta(seconds=item['duration'])
            boost = {
                "id": item['id'],
                "name": item['name'],
                "effect": item.get('effect', {}),
                "expires_at": expires_at.isoformat()
            }
            active_boosts = player.get('active_boosts', [])
            active_boosts.append(boost)
            updates['active_boosts'] = active_boosts
        elif item.get('energy'):
            updates['energy'] = min(player['energy'] + item['energy'], player['max_energy'])

    elif data.category == "premium":
        updates['vip_tier'] = item['tier']
        updates['total_spent'] = player.get('total_spent', 0) + item['price']

    # Deduct currency
    if item['currency'] == 'gems':
        updates['gems'] = player['gems'] - item['price']
    else:
        updates['coins'] = player['coins'] - item['price']

    supabase.table('players').update(updates).eq('id', data.player_id).execute()

    return {
        "success": True,
        "message": f"Purchased {item['name']}",
        "item": item
    }

# Staking Endpoints
@api_router.get("/staking/{player_id}")
async def get_staking_info(player_id: str):
    staking_result = supabase.table('staking').select('*').eq('player_id', player_id).execute()
    player_result = supabase.table('players').select('*').eq('id', player_id).execute()

    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    if not staking_result.data:
        return {
            "player_id": player_id,
            "staked_amount": 0,
            "daily_reward": 0,
            "accumulated_rewards": 0,
            "available_gleaf": player.get('gleaf', 0)
        }

    staking = staking_result.data[0]

    # Calculate accumulated rewards
    now = datetime.now(timezone.utc)
    last_claim = staking.get('last_claim')
    accumulated = staking.get('accumulated_rewards', 0)

    if last_claim and staking.get('staked_amount', 0) > 0:
        last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
        days_passed = (now - last_claim_dt).total_seconds() / 86400
        daily_rate = 0.001
        vip_bonus = VIP_TIERS.get(player.get('vip_tier', 'none'), {}).get('multiplier', 1.0)
        new_rewards = staking['staked_amount'] * daily_rate * days_passed * vip_bonus
        accumulated += new_rewards

    return {
        "player_id": player_id,
        "staked_amount": staking.get('staked_amount', 0),
        "daily_reward": staking.get('staked_amount', 0) * 0.001,
        "accumulated_rewards": accumulated,
        "available_gleaf": player.get('gleaf', 0),
        "stake_start": staking.get('stake_start')
    }

@api_router.post("/staking/stake")
async def stake_gleaf(data: StakeRequest):
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    if player['gleaf'] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient GLeaf")
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum stake is 100 GLeaf")

    now = datetime.now(timezone.utc)

    # Get or create staking record
    staking_result = supabase.table('staking').select('*').eq('player_id', data.player_id).execute()

    if staking_result.data:
        staking = staking_result.data[0]
        supabase.table('staking').update({
            "staked_amount": staking['staked_amount'] + data.amount,
            "last_claim": now.isoformat()
        }).eq('player_id', data.player_id).execute()
    else:
        supabase.table('staking').insert({
            "player_id": data.player_id,
            "staked_amount": data.amount,
            "accumulated_rewards": 0,
            "last_claim": now.isoformat(),
            "stake_start": now.isoformat()
        }).execute()

    supabase.table('players').update({
        "gleaf": player['gleaf'] - data.amount,
        "total_staked": player['total_staked'] + data.amount
    }).eq('id', data.player_id).execute()

    return {"success": True, "staked": data.amount}

@api_router.post("/staking/claim")
async def claim_staking_rewards(player_id: str):
    staking_info = await get_staking_info(player_id)

    if staking_info['accumulated_rewards'] < 1:
        raise HTTPException(status_code=400, detail="No rewards to claim")

    now = datetime.now(timezone.utc)
    rewards = int(staking_info['accumulated_rewards'])

    supabase.table('staking').update({
        "accumulated_rewards": 0,
        "last_claim": now.isoformat()
    }).eq('player_id', player_id).execute()

    player_result = supabase.table('players').select('gleaf').eq('id', player_id).execute()
    if player_result.data:
        player = player_result.data[0]
        supabase.table('players').update({
            "gleaf": player['gleaf'] + rewards
        }).eq('id', player_id).execute()

    return {"success": True, "claimed": rewards}

# Daily Rewards
@api_router.post("/rewards/daily")
async def claim_daily_reward(data: DailyClaimRequest):
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    now = datetime.now(timezone.utc)
    today = now.date().isoformat()

    last_claim = player.get('last_daily_claim')
    if last_claim:
        last_claim_date = last_claim[:10]
        if last_claim_date == today:
            raise HTTPException(status_code=400, detail="Already claimed today")

        yesterday = (now - timedelta(days=1)).date().isoformat()
        if last_claim_date == yesterday:
            new_streak = player.get('daily_streak', 0) + 1
        else:
            new_streak = 1
    else:
        new_streak = 1

    rewards = calculate_daily_streak_bonus(new_streak)

    supabase.table('players').update({
        "coins": player['coins'] + rewards['coins'],
        "gleaf": player['gleaf'] + rewards['gleaf'],
        "gems": player['gems'] + rewards['gems'],
        "daily_streak": new_streak,
        "last_daily_claim": now.isoformat()
    }).eq('id', data.player_id).execute()

    return {
        "success": True,
        "streak": new_streak,
        "rewards": rewards
    }

# Referral System
@api_router.get("/referrals/{player_id}")
async def get_referral_info(player_id: str):
    player_result = supabase.table('players').select('*').eq('id', player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    # Get referred players
    referrals_result = supabase.table('players').select('username, level, created_at').eq('referrer_id', player['referral_code']).execute()
    referrals = referrals_result.data

    vip_bonus = VIP_TIERS.get(player.get('vip_tier', 'none'), {}).get('referral_bonus', 0.05)

    return {
        "referral_code": player['referral_code'],
        "referral_count": player.get('referral_count', 0),
        "referral_earnings": player.get('referral_earnings', 0),
        "bonus_rate": vip_bonus,
        "referrals": referrals
    }

# Leaderboard
@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 50):
    result = supabase.table('players').select('username, wallet_address, gleaf, level, vip_tier').order('gleaf', desc=True).limit(limit).execute()
    players = result.data

    leaderboard = []
    for i, p in enumerate(players):
        leaderboard.append({
            "rank": i + 1,
            "username": p.get('username', 'Anonymous'),
            "wallet_address": p['wallet_address'][:8] + "..." + p['wallet_address'][-4:],
            "gleaf": p.get('gleaf', 0),
            "level": p.get('level', 1),
            "vip_tier": p.get('vip_tier', 'none')
        })

    return leaderboard

# Wallet/Withdraw
@api_router.post("/wallet/withdraw")
async def withdraw(data: WithdrawRequest):
    player_result = supabase.table('players').select('*').eq('id', data.player_id).execute()
    if not player_result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    player = player_result.data[0]

    if data.currency == "gleaf":
        if player['gleaf'] < data.amount:
            raise HTTPException(status_code=400, detail="Insufficient GLeaf")
        if data.amount < 100:
            raise HTTPException(status_code=400, detail="Minimum withdrawal is 100 GLeaf")

    now = datetime.now(timezone.utc)

    # Create withdrawal record
    withdrawal = {
        "player_id": data.player_id,
        "wallet_address": player['wallet_address'],
        "amount": data.amount,
        "currency": data.currency,
        "status": "pending",
        "created_at": now.isoformat()
    }

    result = supabase.table('withdrawals').insert(withdrawal).execute()
    withdrawal_id = result.data[0]['id']

    # Deduct from player
    if data.currency == "gleaf":
        supabase.table('players').update({
            "gleaf": player['gleaf'] - data.amount
        }).eq('id', data.player_id).execute()
    else:
        supabase.table('players').update({
            "coins": player['coins'] - data.amount
        }).eq('id', data.player_id).execute()

    return {
        "success": True,
        "withdrawal_id": withdrawal_id,
        "status": "pending",
        "message": "Withdrawal request submitted"
    }

# Telegram Bot Webhook
@api_router.post("/telegram/webhook")
async def telegram_webhook(data: Dict[str, Any]):
    try:
        # Simple webhook handler - integrate with telegram_bot.py
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": False, "error": str(e)}

# Telegram Cloud Storage
@api_router.post("/telegram/cloud-save")
async def cloud_save(telegram_id: int, data: Dict[str, Any]):
    now = datetime.now(timezone.utc)

    result = supabase.table('telegram_cloud_storage').upsert({
        "telegram_id": telegram_id,
        "data": data,
        "updated_at": now.isoformat()
    }).execute()

    return {"success": True, "data": result.data[0] if result.data else None}

@api_router.get("/telegram/cloud-load/{telegram_id}")
async def cloud_load(telegram_id: int):
    result = supabase.table('telegram_cloud_storage').select('*').eq('telegram_id', telegram_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No saved data")
    return result.data[0]

# Multiplayer Endpoints
@api_router.post("/multiplayer/create-match")
async def create_ranked_match(data: MatchRequest):
    now = datetime.now(timezone.utc)
    match_data = {
        "player1_id": data.player1_id,
        "player2_id": data.player2_id,
        "status": "waiting",
        "entry_fee": data.entry_fee,
        "match_type": "ranked",
        "created_at": now.isoformat()
    }

    result = supabase.table('multiplayer_matches').insert(match_data).execute()
    return result.data[0]

@api_router.post("/multiplayer/start/{match_id}")
async def start_match(match_id: str):
    now = datetime.now(timezone.utc)
    supabase.table('multiplayer_matches').update({
        "status": "active",
        "started_at": now.isoformat()
    }).eq('id', match_id).execute()

    return {"success": True, "message": "Match started"}

@api_router.post("/multiplayer/finish")
async def finish_match(data: FinishMatchRequest):
    now = datetime.now(timezone.utc)
    rewards = {"coins": data.winner_coins, "gleaf": data.winner_gleaf}

    supabase.table('multiplayer_matches').update({
        "status": "completed",
        "ended_at": now.isoformat(),
        "winner_id": data.winner_id,
        "rewards": rewards
    }).eq('id', data.match_id).execute()

    # Award rewards
    player_result = supabase.table('players').select('*').eq('id', data.winner_id).execute()
    if player_result.data:
        player = player_result.data[0]
        supabase.table('players').update({
            "coins": player['coins'] + rewards['coins'],
            "gleaf": player['gleaf'] + rewards['gleaf']
        }).eq('id', data.winner_id).execute()

    return {"success": True, "rewards": rewards}

@api_router.get("/multiplayer/stats/{player_id}")
async def get_multiplayer_stats(player_id: str):
    result = supabase.table('player_multiplayer_stats').select('*').eq('player_id', player_id).execute()

    if not result.data:
        return {
            "player_id": player_id,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "rating": 1000,
            "total_matches": 0
        }

    return result.data[0]

# Stats
@api_router.get("/stats/global")
async def get_global_stats():
    players_result = supabase.table('players').select('gleaf', count='exact').execute()
    total_players = players_result.count

    total_gleaf = sum([p['gleaf'] for p in players_result.data]) if players_result.data else 0

    staking_result = supabase.table('staking').select('staked_amount').execute()
    total_staked = sum([s['staked_amount'] for s in staking_result.data]) if staking_result.data else 0

    return {
        "total_players": total_players,
        "total_gleaf_circulation": total_gleaf,
        "total_staked": total_staked
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
