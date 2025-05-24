import { act, renderHook, waitFor } from '@testing-library/react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '@/utils/firebaseAuth';
import usePortfolio from '@/app/(app)/(tabs)/hooks/usePortfolio';

// Define the expected return type of the usePortfolio hook
interface PortfolioItem {
  id: string;
  fundId: string;
  investedAmount: number;
  units: number;
}

interface UsePortfolioResult {
  portfolio: PortfolioItem[];
  loading: boolean;
  error: string | null;
  addPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
  updatePortfolioItem: (item: PortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
}

// Mocks for Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('@/utils/firebaseAuth', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
  },
}));

describe('usePortfolio', () => {
  const mockPortfolioData: PortfolioItem[] = [
    { id: '1', fundId: 'FUND1', investedAmount: 1000, units: 100 },
    { id: '2', fundId: 'FUND2', investedAmount: 2000, units: 200 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => usePortfolio());
      
      expect(result.current).toEqual({
        portfolio: expect.any(Array),
        loading: expect.any(Boolean),
        error: null,
        addPortfolioItem: expect.any(Function),
        updatePortfolioItem: expect.any(Function), // Assuming setItemToEdit is part of update flow
        handleDeleteItem: expect.any(Function),
      });
    });
  });

  describe('fetching data', () => {
    it('should fetch portfolio data successfully', async () => {
      const mockSnapshot = {
        docs: mockPortfolioData.map(item => ({
          id: item.id,
          data: () => item,
        })),
      };

      (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
        onNext(mockSnapshot);
        return jest.fn();
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.portfolio).toEqual(mockPortfolioData);
      });
    });

    it('should handle fetch errors', async () => {
      (onSnapshot as jest.Mock).mockImplementation((_, __, onError) => {
        onError(new Error('Fetch failed'));
        return jest.fn();
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load portfolio data.');
      });
    });
  });

  describe('CRUD operations', () => {
    it('should add new item', async () => {
      const newItem = { fundId: 'NEW', investedAmount: 3000, units: 300 };
      (addDoc as jest.Mock).mockResolvedValue({ id: '3' });

      const { result } = renderHook(() => usePortfolio());

      await act(async () => {
        await result.current.addPortfolioItem(newItem);
      });

      expect(addDoc).toHaveBeenCalled();
    });

    it('should update existing item', async () => {
      const updatedItem = { ...mockPortfolioData[0], investedAmount: 1500 };
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePortfolio());

      await act(async () => {
        await result.current.updatePortfolioItem(updatedItem);
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should delete item', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePortfolio());

      await act(async () => {
        await result.current.deletePortfolioItem('1');
      });

      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});