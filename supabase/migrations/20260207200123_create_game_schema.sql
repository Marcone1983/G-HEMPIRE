/*
  # G-HEMPIRE Game Schema

  1. New Tables
    - `players` - Main player data (wallet, currencies, level, stats)
      - `id` (uuid, primary key)
      - `wallet_address` (text, unique) - TON wallet address
      - `username` (text) - display name
      - `coins` (numeric) - in-game soft currency
      - `gleaf` (numeric) - premium currency
      - `gems` (integer) - purchasable currency
      - `energy` (integer) - action points
      - `max_energy` (integer) - max action points
      - `level` (integer) - player level
      - `xp` (integer) - experience points
      - `vip_tier` (text) - VIP membership tier
      - `total_spent` (numeric) - total gems spent
      - `total_earned` (numeric) - total coins earned
      - `total_staked` (numeric) - total gleaf staked
      - `referrer_id` (text) - referral code of who referred this player
      - `referral_code` (text, unique) - this player's referral code
      - `referral_count` (integer) - number of referrals
      - `referral_earnings` (numeric) - gleaf earned from referrals
      - `daily_streak` (integer) - consecutive daily logins
      - `last_daily_claim` (timestamptz) - last daily reward claim
      - `last_energy_update` (timestamptz) - last energy regen timestamp
      - `active_boosts` (jsonb) - currently active boost items
      - `owned_items` (jsonb) - purchased cosmetic/nft items
      - `achievements` (jsonb) - unlocked achievements
      - `created_at` (timestamptz) - account creation time
      - `last_active` (timestamptz) - last activity time

    - `plots` - Garden plot slots for planting crops
      - `id` (uuid, primary key)
      - `player_id` (uuid, FK -> players.id)
      - `slot` (integer) - slot position 0-5
      - `crop_type` (text) - type of crop planted
      - `planted_at` (timestamptz) - when crop was planted
      - `ready_at` (timestamptz) - when crop will be ready
      - `is_ready` (boolean) - whether crop can be harvested
      - `unlocked` (boolean) - whether this slot is available
      - `unlock_cost` (integer) - coins needed to unlock

    - `staking` - GLeaf staking records
      - `id` (uuid, primary key)
      - `player_id` (uuid, FK -> players.id, unique)
      - `staked_amount` (numeric) - amount of gleaf staked
      - `accumulated_rewards` (numeric) - unclaimed rewards
      - `last_claim` (timestamptz) - last reward claim time
      - `stake_start` (timestamptz) - when staking began

    - `withdrawals` - Withdrawal request history
      - `id` (uuid, primary key)
      - `player_id` (uuid, FK -> players.id)
      - `wallet_address` (text) - destination wallet
      - `amount` (numeric) - withdrawal amount
      - `currency` (text) - gleaf or coins
      - `status` (text) - pending/completed/failed
      - `created_at` (timestamptz) - request time

  2. Security
    - RLS enabled on all tables
    - Access controlled via edge function using service_role key
    - No direct client access to tables (locked down by default)

  3. Notes
    - All game operations go through the game-api edge function
    - service_role bypasses RLS for server-side operations
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  username text NOT NULL DEFAULT '',
  coins numeric NOT NULL DEFAULT 1000,
  gleaf numeric NOT NULL DEFAULT 0,
  gems integer NOT NULL DEFAULT 50,
  energy integer NOT NULL DEFAULT 100,
  max_energy integer NOT NULL DEFAULT 100,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  vip_tier text NOT NULL DEFAULT 'none',
  total_spent numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_staked numeric NOT NULL DEFAULT 0,
  referrer_id text,
  referral_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  referral_count integer NOT NULL DEFAULT 0,
  referral_earnings numeric NOT NULL DEFAULT 0,
  daily_streak integer NOT NULL DEFAULT 0,
  last_daily_claim timestamptz,
  last_energy_update timestamptz DEFAULT now(),
  active_boosts jsonb NOT NULL DEFAULT '[]'::jsonb,
  owned_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot integer NOT NULL DEFAULT 0,
  crop_type text,
  planted_at timestamptz,
  ready_at timestamptz,
  is_ready boolean NOT NULL DEFAULT false,
  unlocked boolean NOT NULL DEFAULT true,
  unlock_cost integer NOT NULL DEFAULT 0,
  UNIQUE(player_id, slot)
);

ALTER TABLE plots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS staking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  staked_amount numeric NOT NULL DEFAULT 0,
  accumulated_rewards numeric NOT NULL DEFAULT 0,
  last_claim timestamptz,
  stake_start timestamptz
);

ALTER TABLE staking ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'gleaf',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_referral_code ON players(referral_code);
CREATE INDEX IF NOT EXISTS idx_plots_player ON plots(player_id);
CREATE INDEX IF NOT EXISTS idx_staking_player ON staking(player_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawals(player_id);
CREATE INDEX IF NOT EXISTS idx_players_gleaf ON players(gleaf DESC);
