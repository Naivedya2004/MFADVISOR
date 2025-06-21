-- Create amfi_funds table
CREATE TABLE IF NOT EXISTS amfi_funds (
    scheme_code VARCHAR(20) PRIMARY KEY,
    scheme_name TEXT NOT NULL,
    fund_house TEXT,
    fund_category TEXT,
    fund_type TEXT,
    expense_ratio DECIMAL(5, 2),
    inception_date DATE
);

-- Create fund_nav_history table
CREATE TABLE IF NOT EXISTS fund_nav_history (
    id SERIAL PRIMARY KEY,
    amfi_code VARCHAR(10) REFERENCES amfi_funds(scheme_code),
    nav_date DATE NOT NULL,
    nav_value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(amfi_code, nav_date)
);

-- Create index on nav_date for faster queries
CREATE INDEX IF NOT EXISTS idx_fund_nav_history_nav_date ON fund_nav_history(nav_date);

-- Create index on amfi_code for faster joins
CREATE INDEX IF NOT EXISTS idx_fund_nav_history_amfi_code ON fund_nav_history(amfi_code);

-- Create users table for profile management
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile JSONB
);

-- Create transactions table for buy/sell history
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    fund_id VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    units DECIMAL(15,4) NOT NULL,
    nav DECIMAL(10,4) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 