import { auth, db } from '@/firebaseConfig';
import { PortfolioItem } from '@/types';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    QuerySnapshot,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Define the structure for the NAV data from MFAPI
interface FundNavApiData {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string; // This is the field we want for sector
    scheme_code: number;
    scheme_name: string;
  };
  data: Array<{
    date: string;
    nav: string; // NAV is typically a string, convert to number when used
  }>;
  status: string;
}

// New interface to store the details we fetch for each fund
interface FetchedFundDetails {
  nav: number | null;
  category: string | null; // This will hold the scheme_category
}

// Function to fetch NAV and category for a single fund from MFAPI
const fetchNavAndCategoryForFund = async (amfiCode: string): Promise<FetchedFundDetails> => {
  try {
    // MFAPI requires the scheme code as a number in the path
    const response = await fetch(`https://api.mfapi.in/mf/${amfiCode}`);
    if (!response.ok) {
      console.error(`MFAPI error for ${amfiCode}: ${response.statusText}`);
      return { nav: null, category: null };
    }
    const data: FundNavApiData = await response.json();
    
    if (data.status === 'SUCCESS' && data.data && data.data.length > 0) {
      // NAVs are typically returned with the latest first
      return { 
        nav: parseFloat(data.data[0].nav), 
        category: data.meta.scheme_category // Extract the scheme_category
      };
    }
    console.warn(`No NAV or category data found for fund: ${amfiCode}`);
    return { nav: null, category: null };
  } catch (error) {
    console.error(`Error fetching NAV and category for ${amfiCode}:`, error);
    return { nav: null, category: null };
  }
};

interface UsePortfolioResult {
  portfolio: PortfolioItem[];
  loading: boolean;
  error: string | null;
  fundDetails: { [amfiCode: string]: FetchedFundDetails }; // Store fetched NAVs and categories
  navLoading: boolean; // Loading state for NAVs and categories
  addPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => Promise<void>;
  updatePortfolioItem: (item: PortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
}

const usePortfolio = (): UsePortfolioResult => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fundDetails, setFundDetails] = useState<{ [amfiCode: string]: FetchedFundDetails }>({});
  const [navLoading, setNavLoading] = useState<boolean>(false);

  // Add portfolio item to Firestore
  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is logged in.');
    await addDoc(collection(db, `users/${user.uid}/portfolio`), item);
  };

  // Update portfolio item in Firestore
  const updatePortfolioItem = async (item: PortfolioItem) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is logged in.');
    const itemRef = doc(db, `users/${user.uid}/portfolio`, item.id);
    await updateDoc(itemRef, {
      fundId: item.fundId,
      investedAmount: item.investedAmount,
      units: item.units,
    });
  };

  // Delete portfolio item from Firestore
  const deletePortfolioItem = async (id: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is logged in.');
    const itemRef = doc(db, `users/${user.uid}/portfolio`, id);
    await deleteDoc(itemRef);
  };

  // Fetch portfolio data from Firestore
  useEffect(() => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setError('No user is logged in.');
      setLoading(false);
      return;
    }
    const portfolioCollectionRef = collection(db, `users/${user.uid}/portfolio`);
    const q = query(portfolioCollectionRef);
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        const portfolioData = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as PortfolioItem[];
        setPortfolio(portfolioData);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load portfolio data.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch NAVs and categories for portfolio items when portfolio data changes
  useEffect(() => {
    if (portfolio.length > 0) {
      setNavLoading(true);
      const fetchAllNavsAndCategories = async () => {
        const details: { [amfiCode: string]: FetchedFundDetails } = {};
        for (const item of portfolio) {
          const fundDetail = await fetchNavAndCategoryForFund(item.fundId);
          details[item.fundId] = fundDetail;
        }
        setFundDetails(details);
        setNavLoading(false);
      };
      fetchAllNavsAndCategories();
    } else {
      setFundDetails({});
      setNavLoading(false);
    }
  }, [portfolio]); // Re-fetch NAVs and categories when portfolio changes

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
};

export default usePortfolio; 