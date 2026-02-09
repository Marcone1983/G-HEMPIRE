# 🌿 G-HEMPIRE - Cannabis Farming Empire

**A Telegram Mini App game powered by TON Blockchain**

Build your cannabis farming empire, grow premium EVO strains, earn GLeaf tokens, stake for rewards, and compete on the leaderboard!

## 🎮 Features

- **6 Unique EVO Seed Varieties:** From common to mythic rarity
- **Garden Management:** Plant, grow, and harvest cannabis crops
- **GLeaf Token Economy:** Earn in-game cryptocurrency
- **Staking System:** 0.1% daily rewards on staked GLeaf
- **VIP Tiers:** Bronze, Silver, Gold, Diamond with bonus multipliers
- **Referral Program:** Earn rewards for inviting friends
- **TON Blockchain Integration:** Connect wallet for withdrawals
- **Telegram Stars Payments:** Purchase gems with Telegram Stars
- **Multiplayer Battles:** Compete with other players (coming soon)

## 🏗️ Tech Stack

### Frontend
- React 19
- Vite 6
- TailwindCSS + shadcn/ui
- Framer Motion
- TON Connect
- Telegram WebApp SDK

### Backend
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime
- Row Level Security (RLS)

### Blockchain
- TON Blockchain
- TonConnect protocol
- Smart contracts (planned)

## 📁 Project Structure

```
G-HEMPIRE/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components (shadcn)
│   │   ├── utils/           # Utilities (telegram, api)
│   │   ├── App.js           # Main app
│   │   └── index.js         # Entry point
│   ├── public/              # Static assets
│   └── package.json
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/         # Shared utilities
│   │   │   └── telegram-auth.ts
│   │   ├── game-api/        # Main game API
│   │   │   └── index.ts
│   │   └── telegram-webhook/ # Bot webhook handler
│   │       └── index.ts
│   └── migrations/          # Database migrations
│
├── docs/                    # GitHub Pages build output
├── AUDIT_REPORT.md          # Security & compliance audit
├── DEPLOYMENT_GUIDE.md      # Step-by-step deployment
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Telegram Bot Token (@BotFather)
- GitHub account (for hosting)

### Installation

1. **Clone repository:**
```bash
git clone https://github.com/marcone1983/G-HEMPIRE.git
cd G-HEMPIRE
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. **Start development:**
```bash
npm run dev
```

## 📦 Deployment

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for complete instructions.

### Quick Deploy Steps

1. **Setup Telegram Bot** with @BotFather
2. **Configure Supabase** environment variables
3. **Deploy Edge Functions** (already deployed)
4. **Build & Deploy Frontend:**
```bash
npm run build
git add .
git commit -m "Production deployment"
git push origin main
```

5. **Enable GitHub Pages** (branch: main, folder: /docs)

## 🔐 Security

- ✅ Telegram initData validation
- ✅ Row Level Security (RLS) enabled
- ✅ CORS properly configured
- ✅ Bot token secured in environment variables
- ✅ Input validation on all endpoints
- ✅ Rate limiting considerations

## 🎯 Game Mechanics

### Crops

| Crop | Rarity | Cost | Time | Reward | GLeaf | Level |
|------|--------|------|------|--------|-------|-------|
| EVO KUSH | Common | 100 | 1h | 200 | 1 | 1 |
| EVO-CHEESE | Uncommon | 500 | 2h | 1,200 | 5 | 3 |
| EVO-SKUNK | Rare | 2,000 | 4h | 5,000 | 20 | 5 |
| EVO-OG | Epic | 8,000 | 8h | 22,000 | 80 | 8 |
| Golden Bud | Legendary | 30,000 | 12h | 85,000 | 300 | 12 |
| Moon Rocks | Mythic | 100,000 | 24h | 300,000 | 1,000 | 15 |

### VIP Tiers

- **Bronze:** 5% bonus (500 gems)
- **Silver:** 10% bonus (1,500 gems)
- **Gold:** 20% bonus + exclusive crops (5,000 gems)
- **Diamond:** 35% bonus + all features (15,000 gems)

### Staking

- Stake GLeaf tokens for passive income
- 0.1% daily rewards
- VIP multipliers apply
- No lock-up period

## 🤖 Bot Commands

- `/start` - Start the game
- `/play` - Open G-HEMPIRE
- `/stats` - View your statistics
- `/leaderboard` - Top 10 players
- `/referral` - Invite friends & earn
- `/help` - Show help message

## 📊 Database Schema

### Players Table
```sql
- id (UUID)
- wallet_address (TEXT, unique)
- telegram_id (BIGINT, unique)
- username (TEXT)
- coins (NUMERIC)
- gleaf (NUMERIC)
- gems (INTEGER)
- level (INTEGER)
- vip_tier (TEXT)
- referral_code (TEXT, unique)
- ... (see migrations)
```

### Other Tables
- plots
- staking
- withdrawals
- multiplayer_matches
- transactions
- bot_config

## 🔧 API Endpoints

### Game API
```
GET  /api                    - Health check
GET  /api/player/:address    - Get player data
POST /api/player             - Create player
GET  /api/garden/:id         - Get garden state
POST /api/garden/plant       - Plant crop
POST /api/garden/harvest     - Harvest crop
GET  /api/shop               - Get shop items
POST /api/shop/purchase      - Purchase item
GET  /api/staking/:id        - Get staking info
POST /api/staking/stake      - Stake GLeaf
POST /api/staking/claim      - Claim rewards
POST /api/rewards/daily      - Claim daily reward
GET  /api/referrals/:id      - Get referrals
GET  /api/leaderboard        - Get leaderboard
POST /api/wallet/withdraw    - Withdraw request
```

### Telegram Webhook
```
GET  /telegram-webhook       - Get bot status
POST /telegram-webhook/setup - Setup bot
POST /telegram-webhook       - Handle updates
```

## 📈 Roadmap

### Phase 1: MVP ✅
- Core gameplay mechanics
- Telegram integration
- Basic economy

### Phase 2: Monetization (Q1 2026)
- Telegram Stars payments
- TON withdrawals
- Premium features

### Phase 3: Social (Q2 2026)
- Multiplayer battles
- Guilds/Clans
- Trading system

### Phase 4: NFTs (Q3 2026)
- NFT seeds
- Land ownership
- Marketplace

## 🐛 Known Issues

See **[AUDIT_REPORT.md](./AUDIT_REPORT.md)** for complete list.

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For issues or questions:
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Review [AUDIT_REPORT.md](./AUDIT_REPORT.md)
- Contact: @marcone1983 on Telegram

## 🙏 Acknowledgments

- Telegram for Mini Apps platform
- TON Foundation for blockchain infrastructure
- Supabase for backend infrastructure
- shadcn/ui for component library

---

**Built with 💚 by the G-HEMPIRE team**

*Grow responsibly. This is a game - not financial or agricultural advice.*
