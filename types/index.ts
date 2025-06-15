export interface PortfolioItem {
  id: string;
  fundId: string;
  units: number;
  investedAmount: number;
  purchaseDate: string;
  notes?: string;
}