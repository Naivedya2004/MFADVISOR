import { StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useEffect, useState, useCallback } from 'react';

import { View, Text } from 'react-native';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { auth } from '@/utils/firebaseAuth';

export default function TabTwoScreen() { // Renamed from TabTwoScreen to a more descriptive name if appropriate, but keeping for diff consistency
  const [portfolio, setPortfolio] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for calculated metrics
  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState<number>(0);
  const [overallGainLoss, setOverallGainLoss] = useState<number>(0);
  const [fundAllocationData, setFundAllocationData] = useState<any[]>([]);
  const [sectorDistributionData, setSectorDistributionData] = useState<any[]>([]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("No user is logged in.");
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const portfolioCollectionRef = collection(db, `users/${user.uid}/portfolio`);
        const q = query(portfolioCollectionRef);
        const querySnapshot = await getDocs(q);
        const portfolioData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPortfolio(portfolioData);
      } catch (err: any) {
        console.error("Error fetching portfolio:", err);
        setError("Failed to load portfolio data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []); // Empty dependency array means this effect runs once after the initial render

  useEffect(() => {
      // Placeholder function to get latest NAV (replace with your actual logic)
      const getLatestNav = (fundId: string): number => {
        // In a real application, you would fetch the latest NAV for the fundId
        // from your data source or backend.
        // For now, returning a dummy value.
        //console.warn(`Placeholder: Getting latest NAV for fund ${fundId}. Replace with actual data fetching.`);
        // Example dummy NAV: Invested amount + 10% for some, -5% for others

      if (!portfolio) return 0; // Added null check for portfolio
      const fund = portfolio.find(item => item.id === fundId);
        if (fund) {
          return fund.investedAmount * (fundId.charCodeAt(0) % 2 === 0 ? 1.1 : 0.95) / fund.units;
        }
        return 0; // Default if fund not found (shouldn't happen here)
      };
 if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) { // Add more robust check for portfolio
      let calculatedTotalValue = 0;
      let calculatedTotalInvested = 0;
      const calculatedFundAllocationData: any[] = [];
      const calculatedSectorDistributionData: any[] = []; // Requires sector data for each fund

      portfolio.forEach(item => {
        const latestNav = getLatestNav(item.id);
        const currentValue = item.units * latestNav;
        calculatedTotalValue += currentValue;
        calculatedTotalInvested += item.investedAmount;
        calculatedFundAllocationData.push({ name: `Fund ${item.id}`, value: currentValue }); // Basic allocation by current value
      });

      setTotalValue(calculatedTotalValue);
      setTotalInvested(calculatedTotalInvested);
      setOverallGainLoss(calculatedTotalValue - calculatedTotalInvested);
      setFundAllocationData(calculatedFundAllocationData);
      setSectorDistributionData(calculatedSectorDistributionData); // Implement sector distribution calculation
    } else {
      // Reset metrics if portfolio is empty or null
      setTotalValue(0);
      setTotalInvested(0);
      setOverallGainLoss(0);
      setFundAllocationData([]);
      setSectorDistributionData([]);
    }
  }, [portfolio]);

  return (
    <View>
      <View>
        <Text>Dashboard</Text>
      </View>

      <View>
        <Text>Portfolio Data</Text>
        {loading && <ActivityIndicator size="small" color="#0000ff" />}
        {error && <Text>{error}</Text>}
        {!loading && !error && portfolio && Array.isArray(portfolio) && ( // Add more robust check before rendering FlatList
          <FlatList
            data={portfolio}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text>{`Fund ID: ${item.fundId}, Invested: ${item.investedAmount}, Units: ${item.units}`}</Text>}
            ListEmptyComponent={<Text>No portfolio data found.</Text>}
          />
        )}
      </View>

      <View>
        <Text>Fund Allocation</Text>
        <Text>
          [Placeholder for fund allocation chart or list]
        </Text>
        {fundAllocationData.length > 0 && (
          <>
            <Text>Fund Allocation Chart</Text>
            {/* VictoryPie component removed as it caused import errors */}
          </>
        ) : {'null'}
      </View>
      
      <View>
        <Text>Sector Distribution</Text>
        <Text>
          [Placeholder for sector distribution chart or list]
        </Text>
      </View>

      <View>
        <Text>Next Best Actions</Text>
        <Text>
          [Placeholder for AI-powered recommendations]
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({});