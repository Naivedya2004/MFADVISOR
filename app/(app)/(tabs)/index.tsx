import { StyleSheet, ActivityIndicator, FlatList, Button, View, Text, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { auth, signOutUser } from '@/utils/firebaseAuth'; // ✅ single correct import

// 💡 Portfolio data interface
interface PortfolioItem {
  id: string;
  fundId: string;
  investedAmount: number;
  units: number;
}

export default function TabTwoScreen() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState<number>(0);
  const [overallGainLoss, setOverallGainLoss] = useState<number>(0);
  const [fundAllocationData, setFundAllocationData] = useState<any[]>([]);
  const [sectorDistributionData, setSectorDistributionData] = useState<any[]>([]);

  // 🔄 Fetch portfolio data on mount
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
        const portfolioData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PortfolioItem[];

        setPortfolio(portfolioData);
      } catch (err: any) {
        console.error("Error fetching portfolio:", err);
        setError("Failed to load portfolio data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  // 🧠 Calculate total value, gain/loss, allocation
  useEffect(() => {
    const getLatestNav = (fundId: string): number => {
      if (!portfolio) return 0;
      const fund = portfolio.find(item => item.id === fundId);
      if (fund) {
        return fund.investedAmount * (fundId.charCodeAt(0) % 2 === 0 ? 1.1 : 0.95) / fund.units;
      }
      return 0;
    };

    if (portfolio && portfolio.length > 0) {
      let calculatedTotalValue = 0;
      let calculatedTotalInvested = 0;
      const calculatedFundAllocationData: any[] = [];

      portfolio.forEach(item => {
        const latestNav = getLatestNav(item.id);
        const currentValue = item.units * latestNav;
        calculatedTotalValue += currentValue;
        calculatedTotalInvested += item.investedAmount;

        calculatedFundAllocationData.push({
          name: `Fund ${item.fundId}`,
          value: currentValue,
        });
      });

      setTotalValue(calculatedTotalValue);
      setTotalInvested(calculatedTotalInvested);
      setOverallGainLoss(calculatedTotalValue - calculatedTotalInvested);
      setFundAllocationData(calculatedFundAllocationData);
      setSectorDistributionData([]); // Placeholder
    } else {
      setTotalValue(0);
      setTotalInvested(0);
      setOverallGainLoss(0);
      setFundAllocationData([]);
      setSectorDistributionData([]);
    }
  }, [portfolio]);

  // 🔓 Handle Logout
  const handleLogout = async () => {
    try {
      await signOutUser();
      Alert.alert("Logged out", "You have been signed out successfully.");
      // TODO: Navigate to login screen if using a navigation stack
    } catch (e) {
      Alert.alert("Error", "Failed to log out.");
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Dashboard</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfolio Data</Text>
        {loading && <ActivityIndicator size="small" color="#0000ff" />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && portfolio && (
          <FlatList
            data={portfolio}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Text>{`Fund ID: ${item.fundId}, Invested: ₹${item.investedAmount}, Units: ${item.units}`}</Text>
            )}
            ListEmptyComponent={<Text>No portfolio data found.</Text>}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fund Allocation</Text>
        <Text>[📈 Placeholder for Fund Allocation Chart]</Text>
        {fundAllocationData.length > 0 && (
          <Text>Total Value: ₹{totalValue.toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sector Distribution</Text>
        <Text>[📊 Placeholder for Sector Distribution Chart]</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Best Actions</Text>
        <Text>[🤖 Placeholder for AI Recommendations]</Text>
      </View>

      <View style={styles.section}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </View>
  );
}

// 💅 Styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 40,
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
  },
});
