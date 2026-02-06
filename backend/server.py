from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Game Configuration
REVENUE_WALLET = os.environ.get('REVENUE_WALLET', 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR')
GLEAF_CONTRACT = os.environ.get('GLEAF_CONTRACT', 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA')
STAKING_CONTRACT = os.environ.get('STAKING_CONTRACT', 'EQBstk4q4G6yk7qVKCN7O6dpFTR9znN1hEaGSAoN1sVRr5l_')

# Game Constants
CROPS = {
    "cannabis_basic": {"name": "Cannabis Basic", "cost": 100, "time": 3600, "reward": 200, "gleaf": 1, "rarity": "common", "level": 1, "emoji": "🌿"},
    "hybrid_strain": {"name": "Hybrid Strain", "cost": 500, "time": 7200, "reward": 1200, "gleaf": 5, "rarity": "uncommon", "level": 3, "emoji": "🌱"},
    "blueberry_kush": {"name": "Blueberry Kush", "cost": 2000, "time": 14400, "reward": 5000, "gleaf": 20, "rarity": "rare", "level": 5, "emoji": "🫐"},
    "purple_haze": {"name": "Purple Haze", "cost": 8000, "time": 28800, "reward": 22000, "gleaf": 80, "rarity": "epic", "level": 8, "emoji": "💜"},
    "golden_bud": {"name": "Golden Bud", "cost": 30000, "time": 43200, "reward": 85000, "gleaf": 300, "rarity": "legendary", "level": 12, "emoji": "✨"},
    "moon_rocks": {"name": "Moon Rocks", "cost": 100000, "time": 86400, "reward": 300000, "gleaf": 1000, "rarity": "mythic", "level": 15, "emoji": "🌙"},
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

GEMS_PACKAGES = [
    {"id": "gems_starter", "name": "Starter Pack", "gems": 100, "stars": 50, "bonus": 0},
    {"id": "gems_value", "name": "Value Pack", "gems": 550, "stars": 200, "bonus": 50},
    {"id": "gems_pro", "name": "Pro Pack", "gems": 1200, "stars": 400, "bonus": 200},
    {"id": "gems_mega", "name": "Mega Pack", "gems": 3000, "stars": 900, "bonus": 600},
    {"id": "gems_empire", "name": "Empire Pack", "gems": 8000, "stars": 2000, "bonus": 2000},
]

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
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    referrer_id: Optional[str] = None

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    coins: float = 1000
    gleaf: float = 0
    gems: int = 50
    energy: int = 100
    max_energy: int = 100
    level: int = 1
    xp: int = 0
    vip_tier: str = "none"
    total_spent: float = 0
    total_earned: float = 0
    total_staked: float = 0
    referrer_id: Optional[str] = None
    referral_code: str = Field(default_factory=lambda: secrets.token_hex(6))
    referral_count: int = 0
    referral_earnings: float = 0
    daily_streak: int = 0
    last_daily_claim: Optional[str] = None
    last_energy_update: Optional[str] = None
    active_boosts: List[Dict] = []
    owned_items: List[str] = []
    achievements: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_active: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Plot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    slot: int
    crop_type: Optional[str] = None
    planted_at: Optional[str] = None
    ready_at: Optional[str] = None
    is_ready: bool = False
    unlocked: bool = True
    unlock_cost: int = 0

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
    currency: str  # "gleaf" or "coins"

class DailyClaimRequest(BaseModel):
    player_id: str

class ReferralClaimRequest(BaseModel):
    player_id: str

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    wallet_address: str
    gleaf: float
    level: int
    vip_tier: str

class StakingInfo(BaseModel):
    player_id: str
    staked_amount: float
    daily_reward: float
    accumulated_rewards: float
    last_claim: Optional[str] = None
    stake_start: Optional[str] = None

# App Setup
app = FastAPI(title="Cannabis Empire API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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
    multiplier = min(1 + (streak * 0.1), 3.0)  # Max 3x at day 20
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
        last_update_dt = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
        minutes_passed = (now - last_update_dt).total_seconds() / 60
        energy_regen = int(minutes_passed)  # 1 energy per minute
        player['energy'] = min(player['energy'] + energy_regen, player['max_energy'])
    player['last_energy_update'] = now.isoformat()
    return player

def apply_boosts(player: Dict, base_value: float, boost_type: str) -> float:
    now = datetime.now(timezone.utc)
    multiplier = 1.0
    active_boosts = []
    
    for boost in player.get('active_boosts', []):
        expires_at = datetime.fromisoformat(boost['expires_at'].replace('Z', '+00:00'))
        if expires_at > now:
            active_boosts.append(boost)
            if boost_type in boost.get('effect', {}):
                multiplier *= boost['effect'][boost_type]
    
    # Apply VIP bonus
    vip_multiplier = VIP_TIERS.get(player.get('vip_tier', 'none'), {}).get('multiplier', 1.0)
    
    return base_value * multiplier * vip_multiplier

# API Endpoints

@api_router.get("/")
async def root():
    return {"message": "Cannabis Empire API v1.0", "status": "operational"}

@api_router.get("/config")
async def get_config():
    return {
        "crops": CROPS,
        "shop_items": SHOP_ITEMS,
        "gems_packages": GEMS_PACKAGES,
        "vip_tiers": VIP_TIERS,
        "revenue_wallet": REVENUE_WALLET,
        "gleaf_contract": GLEAF_CONTRACT
    }

# Player Endpoints
@api_router.post("/player", response_model=Player)
async def create_player(data: PlayerCreate):
    # Check if player exists
    existing = await db.players.find_one({"wallet_address": data.wallet_address}, {"_id": 0})
    if existing:
        return Player(**existing)
    
    # Create new player
    player = Player(
        wallet_address=data.wallet_address,
        telegram_id=data.telegram_id,
        username=data.username or f"Grower_{secrets.token_hex(3)}",
        referrer_id=data.referrer_id
    )
    
    # Handle referral
    if data.referrer_id:
        referrer = await db.players.find_one({"referral_code": data.referrer_id}, {"_id": 0})
        if referrer:
            # Give bonus to new player
            player.coins += 500
            player.gems += 10
            # Update referrer
            await db.players.update_one(
                {"referral_code": data.referrer_id},
                {
                    "$inc": {"referral_count": 1, "referral_earnings": 100, "gleaf": 5},
                    "$set": {"last_active": datetime.now(timezone.utc).isoformat()}
                }
            )
    
    # Create initial plots (6 slots, first 4 unlocked)
    plots = []
    for i in range(6):
        plot = Plot(
            player_id=player.id,
            slot=i,
            unlocked=i < 4,
            unlock_cost=0 if i < 4 else (1000 * (i - 3))
        )
        plots.append(plot.model_dump())
    
    await db.players.insert_one(player.model_dump())
    await db.plots.insert_many(plots)
    
    return player

@api_router.get("/player/{wallet_address}")
async def get_player(wallet_address: str):
    player = await db.players.find_one({"wallet_address": wallet_address}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = await update_player_energy(player)
    await db.players.update_one(
        {"wallet_address": wallet_address},
        {"$set": {"energy": player['energy'], "last_energy_update": player['last_energy_update']}}
    )
    
    return player

@api_router.put("/player/{wallet_address}")
async def update_player(wallet_address: str, updates: Dict[str, Any]):
    allowed_fields = ['username', 'telegram_id']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data['last_active'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.players.update_one(
        {"wallet_address": wallet_address},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return await get_player(wallet_address)

# Garden Endpoints
@api_router.get("/garden/{player_id}")
async def get_garden(player_id: str):
    plots = await db.plots.find({"player_id": player_id}, {"_id": 0}).to_list(100)
    
    now = datetime.now(timezone.utc)
    for plot in plots:
        if plot.get('ready_at'):
            ready_at = datetime.fromisoformat(plot['ready_at'].replace('Z', '+00:00'))
            plot['is_ready'] = now >= ready_at
            if not plot['is_ready']:
                plot['time_remaining'] = int((ready_at - now).total_seconds())
            else:
                plot['time_remaining'] = 0
    
    return {"plots": plots, "crops": CROPS}

@api_router.post("/garden/plant")
async def plant_crop(data: PlantRequest):
    # Get player
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get crop info
    crop = CROPS.get(data.crop_type)
    if not crop:
        raise HTTPException(status_code=400, detail="Invalid crop type")
    
    # Check level requirement
    if player['level'] < crop['level']:
        raise HTTPException(status_code=400, detail=f"Level {crop['level']} required")
    
    # Check coins
    if player['coins'] < crop['cost']:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Check energy
    if player['energy'] < 10:
        raise HTTPException(status_code=400, detail="Insufficient energy")
    
    # Get plot
    plot = await db.plots.find_one({"player_id": data.player_id, "slot": data.slot}, {"_id": 0})
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    if not plot['unlocked']:
        raise HTTPException(status_code=400, detail="Plot is locked")
    
    if plot.get('crop_type'):
        raise HTTPException(status_code=400, detail="Plot already has a crop")
    
    # Calculate growth time with boosts
    growth_time = crop['time']
    speed_multiplier = 1.0
    for boost in player.get('active_boosts', []):
        if boost.get('effect', {}).get('growth_speed'):
            speed_multiplier = boost['effect']['growth_speed']
    growth_time = int(growth_time / speed_multiplier)
    
    now = datetime.now(timezone.utc)
    ready_at = now + timedelta(seconds=growth_time)
    
    # Update plot
    await db.plots.update_one(
        {"player_id": data.player_id, "slot": data.slot},
        {"$set": {
            "crop_type": data.crop_type,
            "planted_at": now.isoformat(),
            "ready_at": ready_at.isoformat(),
            "is_ready": False
        }}
    )
    
    # Deduct cost and energy
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {"coins": -crop['cost'], "energy": -10, "xp": 10},
            "$set": {"last_active": now.isoformat()}
        }
    )
    
    return {
        "success": True,
        "message": f"Planted {crop['name']}",
        "ready_at": ready_at.isoformat(),
        "growth_time": growth_time
    }

@api_router.post("/garden/harvest")
async def harvest_crop(data: HarvestRequest):
    # Get player
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get plot
    plot = await db.plots.find_one({"player_id": data.player_id, "slot": data.slot}, {"_id": 0})
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
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
    await db.plots.update_one(
        {"player_id": data.player_id, "slot": data.slot},
        {"$set": {
            "crop_type": None,
            "planted_at": None,
            "ready_at": None,
            "is_ready": False
        }}
    )
    
    # Update player
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {"coins": coin_reward, "gleaf": gleaf_reward, "total_earned": coin_reward},
            "$set": {"xp": new_xp, "level": new_level, "last_active": now.isoformat()}
        }
    )
    
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

@api_router.post("/garden/unlock")
async def unlock_plot(player_id: str, slot: int):
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    plot = await db.plots.find_one({"player_id": player_id, "slot": slot}, {"_id": 0})
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    if plot['unlocked']:
        raise HTTPException(status_code=400, detail="Plot already unlocked")
    
    if player['coins'] < plot['unlock_cost']:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    await db.plots.update_one(
        {"player_id": player_id, "slot": slot},
        {"$set": {"unlocked": True}}
    )
    
    await db.players.update_one(
        {"id": player_id},
        {"$inc": {"coins": -plot['unlock_cost']}}
    )
    
    return {"success": True, "message": f"Unlocked plot {slot}"}

# Shop Endpoints
@api_router.get("/shop")
async def get_shop():
    return SHOP_ITEMS

@api_router.post("/shop/purchase")
async def purchase_item(data: PurchaseRequest):
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Find item
    item = None
    for category_items in SHOP_ITEMS.get(data.category, []):
        if category_items['id'] == data.item_id:
            item = category_items
            break
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check currency
    if item['currency'] == 'gems' and player['gems'] < item['price']:
        raise HTTPException(status_code=400, detail="Insufficient gems")
    elif item['currency'] == 'coins' and player['coins'] < item['price']:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    now = datetime.now(timezone.utc)
    updates = {"last_active": now.isoformat()}
    increments = {}
    
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
            increments['energy'] = item['energy']
    
    elif data.category == "premium":
        updates['vip_tier'] = item['tier']
        updates['total_spent'] = player.get('total_spent', 0) + item['price']
    
    elif data.category in ["cosmetics", "nfts"]:
        owned = player.get('owned_items', [])
        if item['id'] not in owned:
            owned.append(item['id'])
            updates['owned_items'] = owned
    
    # Deduct currency
    if item['currency'] == 'gems':
        increments['gems'] = -item['price']
    else:
        increments['coins'] = -item['price']
    
    update_query = {"$set": updates}
    if increments:
        update_query["$inc"] = increments
    
    await db.players.update_one({"id": data.player_id}, update_query)
    
    return {
        "success": True,
        "message": f"Purchased {item['name']}",
        "item": item
    }

@api_router.get("/shop/gems-packages")
async def get_gems_packages():
    return GEMS_PACKAGES

@api_router.post("/shop/purchase-gems")
async def purchase_gems(player_id: str, package_id: str):
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    package = None
    for p in GEMS_PACKAGES:
        if p['id'] == package_id:
            package = p
            break
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    total_gems = package['gems'] + package['bonus']
    
    # In production, this would verify Telegram Stars payment
    await db.players.update_one(
        {"id": player_id},
        {
            "$inc": {"gems": total_gems, "total_spent": package['stars']},
            "$set": {"last_active": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Update VIP tier based on spending
    updated_player = await db.players.find_one({"id": player_id}, {"_id": 0})
    new_tier = calculate_vip_tier(updated_player.get('total_spent', 0))
    if new_tier != updated_player.get('vip_tier'):
        await db.players.update_one({"id": player_id}, {"$set": {"vip_tier": new_tier}})
    
    return {
        "success": True,
        "gems_received": total_gems,
        "new_balance": updated_player['gems'] + total_gems
    }

# Staking Endpoints
@api_router.get("/staking/{player_id}")
async def get_staking_info(player_id: str):
    staking = await db.staking.find_one({"player_id": player_id}, {"_id": 0})
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    if not staking:
        return {
            "player_id": player_id,
            "staked_amount": 0,
            "daily_reward": 0,
            "accumulated_rewards": 0,
            "available_gleaf": player.get('gleaf', 0)
        }
    
    # Calculate accumulated rewards
    now = datetime.now(timezone.utc)
    last_claim = staking.get('last_claim')
    accumulated = staking.get('accumulated_rewards', 0)
    
    if last_claim and staking.get('staked_amount', 0) > 0:
        last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
        days_passed = (now - last_claim_dt).total_seconds() / 86400
        daily_rate = 0.001  # 0.1% daily
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
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    if player['gleaf'] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient GLeaf")
    
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum stake is 100 GLeaf")
    
    now = datetime.now(timezone.utc)
    
    # Get or create staking record
    staking = await db.staking.find_one({"player_id": data.player_id}, {"_id": 0})
    
    if staking:
        await db.staking.update_one(
            {"player_id": data.player_id},
            {
                "$inc": {"staked_amount": data.amount},
                "$set": {"last_claim": now.isoformat()}
            }
        )
    else:
        await db.staking.insert_one({
            "id": str(uuid.uuid4()),
            "player_id": data.player_id,
            "staked_amount": data.amount,
            "accumulated_rewards": 0,
            "last_claim": now.isoformat(),
            "stake_start": now.isoformat()
        })
    
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {"gleaf": -data.amount, "total_staked": data.amount},
            "$set": {"last_active": now.isoformat()}
        }
    )
    
    return {"success": True, "staked": data.amount}

@api_router.post("/staking/unstake")
async def unstake_gleaf(data: StakeRequest):
    staking = await db.staking.find_one({"player_id": data.player_id}, {"_id": 0})
    if not staking or staking['staked_amount'] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient staked amount")
    
    now = datetime.now(timezone.utc)
    
    await db.staking.update_one(
        {"player_id": data.player_id},
        {
            "$inc": {"staked_amount": -data.amount},
            "$set": {"last_claim": now.isoformat()}
        }
    )
    
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {"gleaf": data.amount, "total_staked": -data.amount},
            "$set": {"last_active": now.isoformat()}
        }
    )
    
    return {"success": True, "unstaked": data.amount}

@api_router.post("/staking/claim")
async def claim_staking_rewards(player_id: str):
    staking_info = await get_staking_info(player_id)
    
    if staking_info['accumulated_rewards'] < 1:
        raise HTTPException(status_code=400, detail="No rewards to claim")
    
    now = datetime.now(timezone.utc)
    rewards = int(staking_info['accumulated_rewards'])
    
    await db.staking.update_one(
        {"player_id": player_id},
        {"$set": {"accumulated_rewards": 0, "last_claim": now.isoformat()}}
    )
    
    await db.players.update_one(
        {"id": player_id},
        {"$inc": {"gleaf": rewards}}
    )
    
    return {"success": True, "claimed": rewards}

# Daily Rewards
@api_router.post("/rewards/daily")
async def claim_daily_reward(data: DailyClaimRequest):
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    last_claim = player.get('last_daily_claim')
    if last_claim:
        last_claim_date = last_claim[:10]
        if last_claim_date == today:
            raise HTTPException(status_code=400, detail="Already claimed today")
        
        # Check streak
        yesterday = (now - timedelta(days=1)).date().isoformat()
        if last_claim_date == yesterday:
            new_streak = player.get('daily_streak', 0) + 1
        else:
            new_streak = 1
    else:
        new_streak = 1
    
    rewards = calculate_daily_streak_bonus(new_streak)
    
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {
                "coins": rewards['coins'],
                "gleaf": rewards['gleaf'],
                "gems": rewards['gems']
            },
            "$set": {
                "daily_streak": new_streak,
                "last_daily_claim": now.isoformat(),
                "last_active": now.isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "streak": new_streak,
        "rewards": rewards
    }

# Referral System
@api_router.get("/referrals/{player_id}")
async def get_referral_info(player_id: str):
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get referred players
    referrals = await db.players.find(
        {"referrer_id": player['referral_code']},
        {"_id": 0, "username": 1, "level": 1, "created_at": 1}
    ).to_list(100)
    
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
async def get_leaderboard(limit: int = 50, sort_by: str = "gleaf"):
    sort_field = "gleaf" if sort_by == "gleaf" else "level"
    
    players = await db.players.find(
        {},
        {"_id": 0, "username": 1, "wallet_address": 1, "gleaf": 1, "level": 1, "vip_tier": 1}
    ).sort(sort_field, -1).limit(limit).to_list(limit)
    
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
    player = await db.players.find_one({"id": data.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    if data.currency == "gleaf":
        if player['gleaf'] < data.amount:
            raise HTTPException(status_code=400, detail="Insufficient GLeaf")
        if data.amount < 100:
            raise HTTPException(status_code=400, detail="Minimum withdrawal is 100 GLeaf")
    
    now = datetime.now(timezone.utc)
    
    # Create withdrawal record
    withdrawal = {
        "id": str(uuid.uuid4()),
        "player_id": data.player_id,
        "wallet_address": player['wallet_address'],
        "amount": data.amount,
        "currency": data.currency,
        "status": "pending",
        "created_at": now.isoformat()
    }
    
    await db.withdrawals.insert_one(withdrawal)
    
    # Deduct from player
    await db.players.update_one(
        {"id": data.player_id},
        {
            "$inc": {data.currency: -data.amount},
            "$set": {"last_active": now.isoformat()}
        }
    )
    
    return {
        "success": True,
        "withdrawal_id": withdrawal['id'],
        "status": "pending",
        "message": "Withdrawal request submitted"
    }

@api_router.get("/wallet/history/{player_id}")
async def get_wallet_history(player_id: str):
    withdrawals = await db.withdrawals.find(
        {"player_id": player_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return withdrawals

# Stats
@api_router.get("/stats/global")
async def get_global_stats():
    total_players = await db.players.count_documents({})
    total_gleaf = await db.players.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$gleaf"}}}
    ]).to_list(1)
    total_staked = await db.staking.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$staked_amount"}}}
    ]).to_list(1)
    
    return {
        "total_players": total_players,
        "total_gleaf_circulation": total_gleaf[0]['total'] if total_gleaf else 0,
        "total_staked": total_staked[0]['total'] if total_staked else 0
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
