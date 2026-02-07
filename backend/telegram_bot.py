import os
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self):
        self.bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        self.bot_username = os.environ.get('TELEGRAM_BOT_USERNAME')
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

        mongo_url = os.environ['MONGO_URL']
        self.client = AsyncIOMotorClient(mongo_url)
        self.db = self.client[os.environ['DB_NAME']]

    async def send_message(self, chat_id: int, text: str, keyboard=None):
        async with httpx.AsyncClient() as client:
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
            if keyboard:
                data["reply_markup"] = json.dumps(keyboard)

            response = await client.post(f"{self.api_url}/sendMessage", json=data)
            return response.json()

    async def send_invoice(self, chat_id: int, title: str, description: str, amount: int, payload: str):
        async with httpx.AsyncClient() as client:
            data = {
                "chat_id": chat_id,
                "title": title,
                "description": description,
                "payload": payload,
                "provider_token": os.environ.get('STRIPE_PROVIDER_TOKEN', ''),
                "currency": "USD",
                "prices": [{"label": title, "amount": amount}],
                "start_parameter": payload
            }

            response = await client.post(f"{self.api_url}/sendInvoice", json=data)
            return response.json()

    async def save_user_data(self, telegram_id: int, data: Dict[str, Any]):
        """Save data to Telegram Cloud Storage (using bot API file storage via MongoDB)"""
        user_data = {
            "telegram_id": telegram_id,
            "data": data,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await self.db.telegram_cloud_storage.update_one(
            {"telegram_id": telegram_id},
            {"$set": user_data},
            upsert=True
        )

        return user_data

    async def get_user_data(self, telegram_id: int) -> Optional[Dict]:
        """Retrieve data from cloud storage"""
        return await self.db.telegram_cloud_storage.find_one(
            {"telegram_id": telegram_id},
            {"_id": 0}
        )

    async def handle_start_command(self, chat_id: int, telegram_id: int, username: str):
        """Handle /start command"""
        keyboard = {
            "inline_keyboard": [
                [{"text": "🌱 Play Game", "url": f"https://t.me/{self.bot_username}/play"}],
                [{"text": "💰 Buy Gems", "callback_data": "buy_gems"}],
                [{"text": "👥 Invite Friends", "callback_data": "referral"}]
            ]
        }

        message = f"""
🌿 <b>Welcome to Growverse Hemp Empire!</b>

Grow premium cannabis strains, compete with others, and earn real rewards!

<b>Features:</b>
• 6 unique crop varieties
• Multiplayer battles
• Telegram Stars monetization
• Blockchain integration

Let's build your empire! 🚀
"""

        await self.save_user_data(telegram_id, {
            "username": username,
            "chat_id": chat_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "gems": 50,
            "coins": 1000
        })

        await self.send_message(chat_id, message, keyboard)

    async def handle_callback(self, callback_query_id: int, data: str, chat_id: int, telegram_id: int):
        """Handle inline button callbacks"""

        if data == "buy_gems":
            keyboard = {
                "inline_keyboard": [
                    [{"text": "100 Gems - ⭐50", "callback_data": "purchase_gems_100"}],
                    [{"text": "550 Gems - ⭐200", "callback_data": "purchase_gems_550"}],
                    [{"text": "1200 Gems - ⭐400", "callback_data": "purchase_gems_1200"}],
                    [{"text": "8000 Gems - ⭐2000", "callback_data": "purchase_gems_8000"}]
                ]
            }
            message = "💎 <b>Choose a Gem Package</b>\n\nUpgrade your empire with gems!"
            await self.send_message(chat_id, message, keyboard)

        elif data.startswith("purchase_gems_"):
            amount = int(data.split("_")[-1])
            await self.send_invoice(
                chat_id,
                f"{amount} Gems",
                "Premium gems for Cannabis Empire",
                amount * 10,
                f"gems_{amount}_{telegram_id}"
            )

        elif data == "referral":
            user_data = await self.get_user_data(telegram_id)
            referral_code = user_data.get('referral_code', 'UNKNOWN')
            message = f"""
👥 <b>Invite Friends & Earn!</b>

<code>https://t.me/{self.bot_username}?start={referral_code}</code>

<b>Rewards:</b>
• 500 coins for each friend
• 5 GLeaf per referral
• VIP bonuses apply!
"""
            keyboard = {
                "inline_keyboard": [
                    [{"text": "Share Link", "url": f"https://t.me/share/url?url=https://t.me/{self.bot_username}?start={referral_code}&text=Join%20Growverse%20Hemp%20Empire!"}]
                ]
            }
            await self.send_message(chat_id, message, keyboard)

    async def handle_successful_payment(self, telegram_id: int, payload: str, total_amount: int):
        """Handle successful Telegram Stars payment"""

        user_data = await self.get_user_data(telegram_id)

        if payload.startswith("gems_"):
            gem_amount = int(payload.split("_")[1])

            await self.save_user_data(telegram_id, {
                **user_data,
                "gems": user_data.get("gems", 0) + gem_amount,
                "total_spent": user_data.get("total_spent", 0) + (total_amount / 100),
                "last_purchase": datetime.now(timezone.utc).isoformat()
            })

            await self.send_message(
                user_data['chat_id'],
                f"✅ <b>Purchase Successful!</b>\n\n+{gem_amount} Gems 💎"
            )

class MultiplayerManager:
    def __init__(self, db):
        self.db = db

    async def create_ranked_match(self, player1_id: str, player2_id: str, entry_fee: int = 100) -> Dict:
        """Create a multiplayer ranked match"""
        match = {
            "id": os.urandom(12).hex(),
            "player1_id": player1_id,
            "player2_id": player2_id,
            "status": "waiting",
            "entry_fee": entry_fee,
            "match_type": "ranked",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "started_at": None,
            "ended_at": None,
            "winner_id": None,
            "rewards": {"coins": 0, "gleaf": 0}
        }

        await self.db.multiplayer_matches.insert_one(match)
        return match

    async def start_match(self, match_id: str):
        """Start a match"""
        await self.db.multiplayer_matches.update_one(
            {"id": match_id},
            {
                "$set": {
                    "status": "active",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

    async def finish_match(self, match_id: str, winner_id: str, winner_rewards: Dict):
        """Finish a match and award rewards"""
        match = await self.db.multiplayer_matches.find_one({"id": match_id})

        await self.db.multiplayer_matches.update_one(
            {"id": match_id},
            {
                "$set": {
                    "status": "completed",
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "winner_id": winner_id,
                    "rewards": winner_rewards
                }
            }
        )

        await self.db.players.update_one(
            {"id": winner_id},
            {
                "$inc": {
                    "coins": winner_rewards.get("coins", 0),
                    "gleaf": winner_rewards.get("gleaf", 0),
                    "wins": 1
                }
            }
        )

    async def get_player_stats(self, player_id: str) -> Dict:
        """Get multiplayer stats"""
        stats = await self.db.player_multiplayer_stats.find_one(
            {"player_id": player_id},
            {"_id": 0}
        )

        if not stats:
            stats = {
                "player_id": player_id,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "rating": 1000,
                "total_matches": 0
            }

        return stats
