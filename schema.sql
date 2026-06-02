CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  round_number INTEGER UNIQUE NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  total_collected NUMERIC,
  winner_address VARCHAR(42),
  participants_count INTEGER,
  winner_amount NUMERIC,
  treasury_amount NUMERIC
);

CREATE TABLE IF NOT EXISTS pours (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  amount NUMERIC NOT NULL,
  cro_amount NUMERIC NOT NULL,
  ffs_amount NUMERIC NOT NULL,
  bottle_balance NUMERIC NOT NULL,
  round_pours INTEGER NOT NULL,
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  round_number INTEGER NOT NULL,
  poured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS winners (
  id SERIAL PRIMARY KEY,
  winner_address VARCHAR(42) NOT NULL,
  amount_won NUMERIC NOT NULL,
  treasury_amount NUMERIC NOT NULL,
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  round_number INTEGER NOT NULL,
  won_at TIMESTAMP DEFAULT NOW()
);
