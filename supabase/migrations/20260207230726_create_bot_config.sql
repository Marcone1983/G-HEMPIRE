/*
  # Create bot_config table

  1. New Tables
    - `bot_config`
      - `id` (integer, primary key, always 1 for singleton)
      - `bot_token` (text, encrypted bot token)
      - `bot_username` (text)
      - `game_url` (text)
      - `webhook_url` (text)
      - `is_configured` (boolean)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `bot_config` table
    - No public access policies (only service role can access)
*/

CREATE TABLE IF NOT EXISTS bot_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bot_token text NOT NULL DEFAULT '',
  bot_username text NOT NULL DEFAULT 'GHempireBot',
  game_url text NOT NULL DEFAULT 'https://marcone1983.github.io/G-HEMPIRE/',
  webhook_url text NOT NULL DEFAULT '',
  is_configured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

INSERT INTO bot_config (id, bot_token, bot_username, game_url, is_configured)
VALUES (1, '', 'GHempireBot', 'https://marcone1983.github.io/G-HEMPIRE/', false)
ON CONFLICT (id) DO NOTHING;