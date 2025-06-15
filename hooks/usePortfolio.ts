import { PortfolioItem } from '@/types';
import { API_URL } from '@/utils/api';
import { useEffect, useState } from 'react';

export default function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fundDetails, setFundDetails] = useState<Record<string, { nav: number; category: string }>>({});
  const [navLoading, setNavLoading] = useState(true);

  // Load portfolio data
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/portfolio`);
        const data = await response.json();
        setPortfolio(data);
      } catch (err) {
        setError('Failed to load portfolio data');
        console.error('Portfolio loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  // Load fund details
  useEffect(() => {
    const loadFundDetails = async () => {
      try {
        setNavLoading(true);
        const response = await fetch(`${API_URL}/api/fund-details`);
        const data = await response.json();
        setFundDetails(data);
      } catch (err) {
        setError('Failed to load fund details');
        console.error('Fund details loading error:', err);
      } finally {
        setNavLoading(false);
      }
    };

    loadFundDetails();
  }, []);

  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/api/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const newItem = await response.json();
      setPortfolio(prev => [...prev, newItem]);
    } catch (err) {
      throw new Error('Failed to add portfolio item');
    }
  };

  const updatePortfolioItem = async (item: PortfolioItem) => {
    try {
      const response = await fetch(`${API_URL}/api/portfolio/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const updatedItem = await response.json();
      setPortfolio(prev => prev.map(p => p.id === item.id ? updatedItem : p));
    } catch (err) {
      throw new Error('Failed to update portfolio item');
    }
  };

  const deletePortfolioItem = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/portfolio/${id}`, {
        method: 'DELETE',
      });
      setPortfolio(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw new Error('Failed to delete portfolio item');
    }
  };

  return {
    portfolio,
    loading,
    error,
    fundDetails,
    navLoading,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
  };
} 