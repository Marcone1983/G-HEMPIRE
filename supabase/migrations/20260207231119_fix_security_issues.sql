/*
  # Fix security issues

  1. Drop unused indexes
    - Remove indexes that have not been used to reduce overhead
    - These can be recreated later when query patterns require them

  2. Security
    - Add RLS policy for `bot_config` table (service role only access)
*/

DROP INDEX IF EXISTS idx_players_wallet;
DROP INDEX IF EXISTS idx_players_telegram;
DROP INDEX IF EXISTS idx_players_referral_code;
DROP INDEX IF EXISTS idx_plots_player;
DROP INDEX IF EXISTS idx_staking_player;
DROP INDEX IF EXISTS idx_withdrawals_player;
DROP INDEX IF EXISTS idx_withdrawals_status;
DROP INDEX IF EXISTS idx_matches_players;
DROP INDEX IF EXISTS idx_matches_status;
DROP INDEX IF EXISTS idx_transactions_player;
DROP INDEX IF EXISTS idx_transactions_created;
DROP INDEX IF EXISTS idx_matches_player2;
DROP INDEX IF EXISTS idx_matches_winner;
DROP INDEX IF EXISTS idx_players_gleaf;

CREATE POLICY "Service role can read bot_config"
  ON bot_config FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update bot_config"
  ON bot_config FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert bot_config"
  ON bot_config FOR INSERT
  TO service_role
  WITH CHECK (true);