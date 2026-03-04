/*
  # Create NHL Stats Application Tables

  1. New Tables
    - `teams`
      - `id` (serial, primary key)
      - `name` (text, team full name)
      - `abbreviation` (varchar, unique team code)
      - `logo` (text, team logo URL)
      - `cap_hit` (integer, salary cap hit)
      - `cap_space` (integer, available cap space)
      - `projected_cap_space` (integer, projected future cap space)
      - `ltir` (integer, long-term injured reserve)
      - `contracts` (integer, number of contracts)
      - `color` (varchar, team primary color)
    
    - `players`
      - `id` (serial, primary key)
      - `name` (text, player name)
      - `team_id` (integer, references teams)
      - `position` (varchar, player position)
      - `age` (integer, player age)
      - `cap_hit` (integer, salary cap hit)
      - `cap_percentage` (numeric, percentage of team cap)
      - `contract_length` (integer, contract duration in years)
      - `expiry_year` (integer, contract expiry year)
      - `draft_year` (integer, year drafted)
      - `draft_round` (integer, draft round)
      - `draft_overall` (integer, overall draft pick)
      - `status` (varchar, player status)
    
    - `transactions`
      - `id` (serial, primary key)
      - `type` (varchar, transaction type)
      - `player` (text, player name)
      - `team` (text, team involved)
      - `details` (text, transaction details)
      - `date` (varchar, transaction date)
    
    - `games`
      - `id` (serial, primary key)
      - `nhl_game_id` (integer, unique NHL API game ID)
      - `date` (varchar, game date)
      - `start_time_utc` (text, game start time)
      - `home_team_abbr` (varchar, home team code)
      - `away_team_abbr` (varchar, away team code)
      - `home_score` (integer, home team score)
      - `away_score` (integer, away team score)
      - `status` (varchar, game status)
      - `venue` (text, venue name)
      - `season` (varchar, season identifier)
      - `period_number` (integer, current period)
      - `period_type` (varchar, period type)
      - `is_final` (boolean, game completed flag)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (this is a public NHL stats app)
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation VARCHAR(5) NOT NULL UNIQUE,
  logo TEXT NOT NULL,
  cap_hit INTEGER NOT NULL DEFAULT 0,
  cap_space INTEGER NOT NULL DEFAULT 0,
  projected_cap_space INTEGER NOT NULL DEFAULT 0,
  ltir INTEGER NOT NULL DEFAULT 0,
  contracts INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(10) NOT NULL DEFAULT '#000000'
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  position VARCHAR(5) NOT NULL,
  age INTEGER NOT NULL,
  cap_hit INTEGER NOT NULL DEFAULT 0,
  cap_percentage NUMERIC(5, 1) NOT NULL DEFAULT 0,
  contract_length INTEGER NOT NULL DEFAULT 1,
  expiry_year INTEGER NOT NULL,
  draft_year INTEGER,
  draft_round INTEGER,
  draft_overall INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'Signed'
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  player TEXT NOT NULL,
  team TEXT NOT NULL,
  details TEXT NOT NULL,
  date VARCHAR(10) NOT NULL
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  nhl_game_id INTEGER UNIQUE,
  date VARCHAR(10) NOT NULL,
  start_time_utc TEXT,
  home_team_abbr VARCHAR(5) NOT NULL,
  away_team_abbr VARCHAR(5) NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status VARCHAR(10) NOT NULL DEFAULT 'FUT',
  venue TEXT,
  season VARCHAR(8),
  period_number INTEGER,
  period_type VARCHAR(5),
  is_final BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Public read access policies (this is a public NHL stats app)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view players"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view transactions"
  ON transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view games"
  ON games FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can modify all tables
CREATE POLICY "Service role can insert teams"
  ON teams FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update teams"
  ON teams FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete teams"
  ON teams FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert players"
  ON players FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update players"
  ON players FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete players"
  ON players FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert transactions"
  ON transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete transactions"
  ON transactions FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert games"
  ON games FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update games"
  ON games FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete games"
  ON games FOR DELETE
  TO service_role
  USING (true);