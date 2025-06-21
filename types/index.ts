export interface PortfolioItem {
  id: number;
  fund_id: string; // AMFI Scheme Code
  invested_amount: number;
  units: number;
  purchase_date?: string;
}

export interface UserProfile {
  email: string;
  risk_tolerance?: 'low' | 'medium' | 'high';
  investment_horizon?: number; // in years
  goals?: string[];
}