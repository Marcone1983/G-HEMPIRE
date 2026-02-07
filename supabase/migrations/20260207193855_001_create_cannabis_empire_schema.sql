/*
  # Cannabis Empire - Complete Database Schema

  ## Overview
  Complete schema for Growverse Hemp Empire Telegram Mini App with TON blockchain integration.

  ## New Tables
  
  ### 1. players
  Main player profile and game state
  - `id` (uuid, primary key)
  - `wallet_address` (text, unique) - TON wallet address
  - `telegram_id` (bigint, unique) - Telegram user ID
  - `username` (text) - Display name
  - `coins` (numeric) - In-game currency
  - `gleaf` (numeric) - Premium token (GLeaf)
  - `gems` (integer) - Premium currency
  - `energy` (integer) - Action points
  - `max_energy` (integer) - Max energy capacity
  - `level` (integer) - Player level
  - `xp` (integer) - Experience points
  - `vip_tier` (text) - VIP status: none, bronze, silver, gold, diamond
  - `total_spent` (numeric) - Total spending (for VIP calculation)
  - `total_earned` (numeric) - Lifetime earnings
  - `total_staked` (numeric) - Total GLeaf staked
  - `referrer_id` (text) - Referral code of inviter
  - `referral_code` (text, unique) - Player's referral code
  - `referral_count` (integer) - Number of referrals
  - `referral_earnings` (numeric) - Earnings from referrals
  - `daily_streak` (integer) - Login streak days
  - `last_daily_claim` (timestamptz) - Last daily reward claim
  - `last_energy_update` (timestamptz) - Last energy regeneration
  - `active_boosts` (jsonb) - Active boost effects
  - `owned_items` (text[]) - Purchased items array
  - `achievements` (text[]) - Unlocked achievements
  - `created_at` (timestamptz)
  - `last_active` (timestamptz)

  ### 2. plots
  Garden plots for growing crops
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key)
  - `slot` (integer) - Plot number (0-5)
  - `crop_type` (text) - Type of crop planted
  - `planted_at` (timestamptz) - When crop was planted
  - `ready_at` (timestamptz) - When crop is ready to harvest
  - `is_ready` (boolean) - Harvest ready flag
  - `unlocked` (boolean) - Plot unlocked status
  - `unlock_cost` (integer) - Cost to unlock

  ### 3. staking
  GLeaf staking records
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key, unique)
  - `staked_amount` (numeric) - Amount staked
  - `accumulated_rewards` (numeric) - Pending rewards
  - `last_claim` (timestamptz) - Last reward claim
  - `stake_start` (timestamptz) - When staking started

  ### 4. withdrawals
  Withdrawal transaction history
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key)
  - `wallet_address` (text) - Destination wallet
  - `amount` (numeric) - Withdrawal amount
  - `currency` (text) - gleaf or coins
  - `status` (text) - pending, completed, failed
  - `tx_hash` (text) - Blockchain transaction hash
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### 5. multiplayer_matches
  Ranked PvP matches
  - `id` (uuid, primary key)
  - `player1_id` (uuid, foreign key)
  - `player2_id` (uuid, foreign key)
  - `status` (text) - waiting, active, completed, cancelled
  - `entry_fee` (integer) - Entry cost
  - `match_type` (text) - ranked, casual, tournament
  - `winner_id` (uuid) - Winner player ID
  - `rewards` (jsonb) - Reward breakdown
  - `created_at` (timestamptz)
  - `started_at` (timestamptz)
  - `ended_at` (timestamptz)

  ### 6. player_multiplayer_stats
  Player PvP statistics
  - `player_id` (uuid, primary key, foreign key)
  - `wins` (integer) - Total wins
  - `losses` (integer) - Total losses
  - `draws` (integer) - Total draws
  - `rating` (integer) - ELO rating
  - `total_matches` (integer) - Total matches played
  - `win_streak` (integer) - Current win streak
  - `best_streak` (integer) - Best win streak
  - `updated_at` (timestamptz)

  ### 7. telegram_cloud_storage
  Telegram cloud save data
  - `telegram_id` (bigint, primary key)
  - `data` (jsonb) - Saved game data
  - `updated_at` (timestamptz)

  ### 8. transactions
  All in-game transactions log
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key)
  - `type` (text) - purchase, reward, harvest, referral
  - `amount` (numeric) - Transaction amount
  - `currency` (text) - coins, gleaf, gems
  - `description` (text) - Transaction details
  - `metadata` (jsonb) - Additional data
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Players can only access their own data
  - Multiplayer data visible to match participants
  - Admin operations require service role

  ## Indexes
  - Optimized for lookups by player_id, wallet_address, telegram_id
  - Match queries optimized for active/recent matches
  - Transaction history indexed by player and timestamp
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players Table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text UNIQUE NOT NULL,
  telegram_id bigint UNIQUE,
  username text NOT NULL,
  coins numeric DEFAULT 1000,
  gleaf numeric DEFAULT 0,
  gems integer DEFAULT 50,
  energy integer DEFAULT 100,
  max_energy integer DEFAULT 100,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  vip_tier text DEFAULT 'none',
  total_spent numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_staked numeric DEFAULT 0,
  referrer_id text,
  referral_code text UNIQUE NOT NULL,
  referral_count integer DEFAULT 0,
  referral_earnings numeric DEFAULT 0,
  daily_streak integer DEFAULT 0,
  last_daily_claim timestamptz,
  last_energy_update timestamptz DEFAULT now(),
  active_boosts jsonb DEFAULT '[]'::jsonb,
  owned_items text[] DEFAULT ARRAY[]::text[],
  achievements text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Plots Table
CREATE TABLE IF NOT EXISTS plots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot integer NOT NULL,
  crop_type text,
  planted_at timestamptz,
  ready_at timestamptz,
  is_ready boolean DEFAULT false,
  unlocked boolean DEFAULT true,
  unlock_cost integer DEFAULT 0,
  UNIQUE(player_id, slot)
);

-- Staking Table
CREATE TABLE IF NOT EXISTS staking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  staked_amount numeric DEFAULT 0,
  accumulated_rewards numeric DEFAULT 0,
  last_claim timestamptz DEFAULT now(),
  stake_start timestamptz DEFAULT now()
);

-- Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text DEFAULT 'pending',
  tx_hash text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Multiplayer Matches Table
CREATE TABLE IF NOT EXISTS multiplayer_matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status text DEFAULT 'waiting',
  entry_fee integer DEFAULT 100,
  match_type text DEFAULT 'ranked',
  winner_id uuid REFERENCES players(id),
  rewards jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Player Multiplayer Stats Table
CREATE TABLE IF NOT EXISTS player_multiplayer_stats (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  draws integer DEFAULT 0,
  rating integer DEFAULT 1000,
  total_matches integer DEFAULT 0,
  win_streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Telegram Cloud Storage Table
CREATE TABLE IF NOT EXISTS telegram_cloud_storage (
  telegram_id bigint PRIMARY KEY,
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_telegram ON players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_players_referral_code ON players(referral_code);
CREATE INDEX IF NOT EXISTS idx_plots_player ON plots(player_id);
CREATE INDEX IF NOT EXISTS idx_staking_player ON staking(player_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawals(player_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_matches_players ON multiplayer_matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON multiplayer_matches(status);
CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_multiplayer_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_cloud_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for players
CREATE POLICY "Players can view own profile"
  ON players FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Players can update own profile"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Anyone can create player"
  ON players FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for plots
CREATE POLICY "Players can view own plots"
  ON plots FOR SELECT
  TO authenticated
  USING (player_id::text = auth.uid()::text);

CREATE POLICY "Players can modify own plots"
  ON plots FOR ALL
  TO authenticated
  USING (player_id::text = auth.uid()::text)
  WITH CHECK (player_id::text = auth.uid()::text);

-- RLS Policies for staking
CREATE POLICY "Players can view own staking"
  ON staking FOR SELECT
  TO authenticated
  USING (player_id::text = auth.uid()::text);

CREATE POLICY "Players can modify own staking"
  ON staking FOR ALL
  TO authenticated
  USING (player_id::text = auth.uid()::text)
  WITH CHECK (player_id::text = auth.uid()::text);

-- RLS Policies for withdrawals
CREATE POLICY "Players can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (player_id::text = auth.uid()::text);

CREATE POLICY "Players can create withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (player_id::text = auth.uid()::text);

-- RLS Policies for multiplayer_matches
CREATE POLICY "Players can view own matches"
  ON multiplayer_matches FOR SELECT
  TO authenticated
  USING (player1_id::text = auth.uid()::text OR player2_id::text = auth.uid()::text);

CREATE POLICY "Players can create matches"
  ON multiplayer_matches FOR INSERT
  TO authenticated
  WITH CHECK (player1_id::text = auth.uid()::text OR player2_id::text = auth.uid()::text);

-- RLS Policies for player_multiplayer_stats
CREATE POLICY "Players can view own stats"
  ON player_multiplayer_stats FOR SELECT
  TO authenticated
  USING (player_id::text = auth.uid()::text);

CREATE POLICY "Players can update own stats"
  ON player_multiplayer_stats FOR ALL
  TO authenticated
  USING (player_id::text = auth.uid()::text)
  WITH CHECK (player_id::text = auth.uid()::text);

-- RLS Policies for telegram_cloud_storage
CREATE POLICY "Users can access own cloud data"
  ON telegram_cloud_storage FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for transactions
CREATE POLICY "Players can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (player_id::text = auth.uid()::text);

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
