-- Create amfi_funds table
CREATE TABLE IF NOT EXISTS amfi_funds (
    scheme_code VARCHAR(10) PRIMARY KEY,
    scheme_name TEXT NOT NULL
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