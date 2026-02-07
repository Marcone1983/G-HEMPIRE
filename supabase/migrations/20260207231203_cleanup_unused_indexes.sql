/*
  # Cleanup unused indexes

  Dropping indexes that are flagged as unused.
  These tables currently have no traffic.
  Indexes can be re-created based on actual query patterns when needed.
*/

DROP INDEX IF EXISTS idx_players_wallet;
DROP INDEX IF EXISTS idx_players_telegram;
DROP INDEX IF EXISTS idx_players_referral_code;
DROP INDEX IF EXISTS idx_players_gleaf;
DROP INDEX IF EXISTS idx_plots_player;
DROP INDEX IF EXISTS idx_staking_player;
DROP INDEX IF EXISTS idx_withdrawals_player;
DROP INDEX IF EXISTS idx_withdrawals_status;
DROP INDEX IF EXISTS idx_matches_players;
DROP INDEX IF EXISTS idx_matches_status;
DROP INDEX IF EXISTS idx_matches_player2;
DROP INDEX IF EXISTS idx_matches_winner;
DROP INDEX IF EXISTS idx_transactions_player;
DROP INDEX IF EXISTS idx_transactions_created;