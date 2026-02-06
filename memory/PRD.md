# Cannabis Empire - PRD (Product Requirements Document)

## Original Problem Statement
Sviluppo di un gioco di farming di cannabis per Telegram Mini App su TON Blockchain con TMA SDK, TON Connect, e sistema di monetizzazione completo.

## User Personas
1. **Crypto Gamer**: Utente Telegram che cerca giochi play-to-earn su blockchain
2. **TON Holder**: Holder di TON che vuole guadagnare token giocando
3. **Casual Gamer**: Giocatore casual interessato al farming game con progressione

## Core Requirements (Static)
- ✅ Garden farming system con 6 crops di diverse rarità
- ✅ Sistema economico: Coins, GLeaf tokens, Gems
- ✅ Shop con 4 categorie: Boosts, Premium VIP, Cosmetics, NFTs
- ✅ Staking system con 0.1% daily rewards
- ✅ Daily bonuses con streak system
- ✅ Referral program con bonus a cascata
- ✅ VIP tiers: Bronze, Silver, Gold, Diamond
- ✅ TON Connect wallet integration
- ✅ Leaderboard globale

## Architecture
### Backend (FastAPI + MongoDB)
- `/api/player` - Player CRUD operations
- `/api/garden` - Garden management (plant, harvest, plots)
- `/api/shop` - Shop purchases
- `/api/staking` - GLeaf staking operations
- `/api/rewards` - Daily rewards system
- `/api/wallet` - Withdraw operations
- `/api/referrals` - Referral program
- `/api/leaderboard` - Global rankings

### Frontend (React + Tailwind)
- TON Connect UI integration
- 5 main pages: Garden, Shop, Staking, Wallet, Profile
- Glassmorphism design with neon green accent
- Mobile-first responsive layout

## What's Been Implemented (2026-02-06)
1. **Backend API** - Full FastAPI implementation with all endpoints
2. **MongoDB Models** - Player, Plot, Staking, Withdrawal collections
3. **Game Logic** - Complete farming mechanics with timing, rewards, boosts
4. **Frontend** - Complete React SPA with all pages
5. **TON Connect** - Wallet connection integration
6. **Shop System** - All categories functional
7. **Staking** - Stake/unstake/claim rewards
8. **Referral System** - Code generation and tracking

## Prioritized Backlog
### P0 (Critical)
- ✅ Core farming gameplay
- ✅ Shop and monetization
- ✅ Wallet integration

### P1 (High)
- [ ] Telegram Bot integration (@CannabisEmpireBot)
- [ ] Telegram Stars payment integration
- [ ] GLeaf smart contract deployment on TON
- [ ] Real blockchain transactions

### P2 (Medium)
- [ ] NFT minting on TON
- [ ] Tournament system
- [ ] Flash sales events
- [ ] Achievement system

### P3 (Low)
- [ ] Social features (chat, friends)
- [ ] Custom cosmetics display
- [ ] Push notifications via Telegram

## Next Tasks
1. Create Telegram Bot via BotFather
2. Deploy GLeaf Jetton smart contract on TON testnet
3. Integrate Telegram Stars for gem purchases
4. Add harvest animations and sound effects
5. Implement achievement tracking system

## Configuration
- Revenue Wallet: UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR
- GLeaf Contract: (to be deployed)
- Staking Contract: (to be deployed)
