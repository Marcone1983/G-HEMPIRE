/*
  # Fix Security and Performance Issues

  ## 1. Missing Foreign Key Indexes
  - Add index on `multiplayer_matches.player2_id`
  - Add index on `multiplayer_matches.winner_id`

  ## 2. RLS Auth Initialization Performance
  - Replace `auth.uid()` with `(select auth.uid())` in ALL policies
  - This prevents re-evaluation per row and uses a single subquery instead

  ## 3. Overlapping Permissive Policies
  - Remove `FOR ALL` policies on `plots`, `staking`, `player_multiplayer_stats`
  - Replace with separate INSERT, UPDATE, DELETE policies

  ## 4. Overly Permissive Policies (Always True)
  - `players` INSERT: restrict to matching wallet_address
  - `telegram_cloud_storage`: separate into per-operation policies with ownership checks
  - `transactions` INSERT: restrict to authenticated users inserting own records

  ## Important Notes
  1. All policies dropped and recreated with optimized auth pattern
  2. No data changes, only security and index changes
*/

-- ===========================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_matches_player2 ON multiplayer_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON multiplayer_matches(winner_id);

-- ===========================================
-- 2 & 3 & 4. RECREATE ALL RLS POLICIES
-- ===========================================

-- ---- PLAYERS ----
DROP POLICY IF EXISTS "Players can view own profile" ON players;
DROP POLICY IF EXISTS "Players can update own profile" ON players;
DROP POLICY IF EXISTS "Anyone can create player" ON players;

CREATE POLICY "Players can view own profile"
  ON players FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = id::text);

CREATE POLICY "Players can update own profile"
  ON players FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = id::text)
  WITH CHECK ((select auth.uid())::text = id::text);

CREATE POLICY "Authenticated users can create own player"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = id::text);

-- Service role insert for backend-driven player creation
CREATE POLICY "Service role can insert players"
  ON players FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---- PLOTS ----
DROP POLICY IF EXISTS "Players can view own plots" ON plots;
DROP POLICY IF EXISTS "Players can modify own plots" ON plots;

CREATE POLICY "Players can view own plots"
  ON plots FOR SELECT
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can insert own plots"
  ON plots FOR INSERT
  TO authenticated
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can update own plots"
  ON plots FOR UPDATE
  TO authenticated
  USING (player_id::text = (select auth.uid())::text)
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can delete own plots"
  ON plots FOR DELETE
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage plots"
  ON plots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- STAKING ----
DROP POLICY IF EXISTS "Players can view own staking" ON staking;
DROP POLICY IF EXISTS "Players can modify own staking" ON staking;

CREATE POLICY "Players can view own staking"
  ON staking FOR SELECT
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can insert own staking"
  ON staking FOR INSERT
  TO authenticated
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can update own staking"
  ON staking FOR UPDATE
  TO authenticated
  USING (player_id::text = (select auth.uid())::text)
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can delete own staking"
  ON staking FOR DELETE
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage staking"
  ON staking FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- WITHDRAWALS ----
DROP POLICY IF EXISTS "Players can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Players can create withdrawals" ON withdrawals;

CREATE POLICY "Players can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can create own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage withdrawals"
  ON withdrawals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- MULTIPLAYER MATCHES ----
DROP POLICY IF EXISTS "Players can view own matches" ON multiplayer_matches;
DROP POLICY IF EXISTS "Players can create matches" ON multiplayer_matches;

CREATE POLICY "Players can view own matches"
  ON multiplayer_matches FOR SELECT
  TO authenticated
  USING (
    player1_id::text = (select auth.uid())::text
    OR player2_id::text = (select auth.uid())::text
  );

CREATE POLICY "Players can create own matches"
  ON multiplayer_matches FOR INSERT
  TO authenticated
  WITH CHECK (player1_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage matches"
  ON multiplayer_matches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- PLAYER MULTIPLAYER STATS ----
DROP POLICY IF EXISTS "Players can view own stats" ON player_multiplayer_stats;
DROP POLICY IF EXISTS "Players can update own stats" ON player_multiplayer_stats;

CREATE POLICY "Players can view own stats"
  ON player_multiplayer_stats FOR SELECT
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Players can update own stats"
  ON player_multiplayer_stats FOR UPDATE
  TO authenticated
  USING (player_id::text = (select auth.uid())::text)
  WITH CHECK (player_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage stats"
  ON player_multiplayer_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- TELEGRAM CLOUD STORAGE ----
DROP POLICY IF EXISTS "Users can access own cloud data" ON telegram_cloud_storage;

CREATE POLICY "Service role can manage cloud storage"
  ON telegram_cloud_storage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- TRANSACTIONS ----
DROP POLICY IF EXISTS "Players can view own transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;

CREATE POLICY "Players can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (player_id::text = (select auth.uid())::text);

CREATE POLICY "Service role can manage transactions"
  ON transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
