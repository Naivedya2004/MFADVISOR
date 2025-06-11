import axios from 'axios';

// Example: Fetch stock data from Alpha Vantage
export async function getStockQuote(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
    throw error;
  }
} 