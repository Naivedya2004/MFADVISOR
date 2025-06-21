import { auth } from '@/firebaseConfig';
import { PortfolioItem } from '@/types';
import { useEffect, useState } from 'react';
import * as api from '../utils/api';

interface UsePortfolioResult {
  portfolio: PortfolioItem[];
  loading: boolean;
  error: string | null;
  // The fundDetails and navLoading are removed as this logic will be handled by the backend
  addPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
  updatePortfolioItem: (item: PortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: number) => Promise<void>;
  refetchPortfolio: () => void;
}

const usePortfolio = (): UsePortfolioResult => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  const fetchPortfolio = async () => {
    if (!user) {
      setError('No user is logged in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getPortfolio(user.uid);
      setPortfolio(data);
    } catch (e: any) {
      setError('Failed to load portfolio data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [user]);

  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>) => {
    if (!user) throw new Error('No user is logged in.');
    await api.addPortfolioItem(user.uid, item);
    fetchPortfolio();
  };

  const updatePortfolioItem = async (item: PortfolioItem) => {
    if (!user) throw new Error('No user is logged in.');
    const { id, ...rest } = item;
    await api.updatePortfolioItem(user.uid, id, rest);
    fetchPortfolio();
  };

  const deletePortfolioItem = async (id: number) => {
    if (!user) throw new Error('No user is logged in.');
    await api.deletePortfolioItem(user.uid, id);
    fetchPortfolio();
  };

  return {
    portfolio,
    loading,
    error,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    refetchPortfolio: fetchPortfolio,
  };
};

export default usePortfolio; 