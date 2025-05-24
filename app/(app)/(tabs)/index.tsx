import { StyleSheet, ActivityIndicator, FlatList, Button, View, Text, Alert, Dimensions, TouchableOpacity } from 'react-native'; // Import Dimensions and TouchableOpacity
import { useEffect, useState } from 'react';
import { PieChart } from 'react-native-chart-kit';
import { getFirestore, collection, query, addDoc, doc, updateDoc, deleteDoc, Firestore, onSnapshot, QuerySnapshot, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore'; // Import doc, updateDoc, deleteDoc, Firestore, onSnapshot and types
import ManagePortfolioItemModal from '@/components/ManagePortfolioItemModal';
import { auth, signOutUser } from '@/utils/firebaseAuth'; // ✅ single correct import

// 💡 Portfolio data interface
interface PortfolioItem {
  id: string;
  fundId: string;
  // Assuming these are numbers based on usage in calculations
  investedAmount: number;
  units: number;
}


// 💡 Mock fund to sector mapping
const fundToSectorMapping: { [key: string]: string } = {
  'fund1': 'Technology',
  'fund2': 'Healthcare',
  'fund3': 'Finance',
  'fund4': 'Technology',
};

const db: Firestore = getFirestore(); // Initialize db here

export default function TabTwoScreen() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState<number>(0);
  const [overallGainLoss, setOverallGainLoss] = useState<number>(0);
  const [fundAllocationData, setFundAllocationData] = useState<any[]>([]);
  const [sectorDistributionData, setSectorDistributionData] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PortfolioItem | null>(null);

  // 🔄 Fetch portfolio data on mount
 useEffect(() => {
 const user = auth.currentUser;
 if (!user) {
 setError("No user is logged in.");
 setLoading(false);
 return;
 }

 setLoading(true);
 const portfolioCollectionRef = collection(db, `users/${user.uid}/portfolio`);
 const q = query(portfolioCollectionRef);

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot) => {
 const portfolioData = querySnapshot.docs.map(doc => ({
      ...doc.data() as PortfolioItem, // Spread data first
      id: doc.id, // Explicitly set id, overwriting any id in doc.data()
 })) as PortfolioItem[];

 setPortfolio(portfolioData);
 setLoading(false);
 }, (error) => {
 console.error("Error fetching portfolio:", error);
 setError("Failed to load portfolio data.");
 setLoading(false);
 });

 // Cleanup function to unsubscribe
 return () => unsubscribe();
  }, []);

  // 🧠 Calculate total value, gain/loss, allocation
  useEffect(() => {
   const getLatestNav = (fundId: string): number => {
      if (!portfolio) return 0;
      const fund = portfolio.find(item => item.id === fundId);
      if (fund && fund.units !== 0) { // Prevent division by zero
        return fund.investedAmount * (fundId.charCodeAt(0) % 2 === 0 ? 1.1 : 0.95) / fund.units;
      }
      return 0;
    };

    if (portfolio && portfolio.length > 0) {
      let calculatedTotalValue = 0;
      let calculatedTotalInvested = 0;
      const calculatedFundAllocationData: any[] = [];
      const calculatedSectorDistribution: { [sector: string]: number } = {};

      portfolio.forEach(item => {
        const latestNav = getLatestNav(item.id);
        const currentValue = item.units * latestNav;
        calculatedTotalValue += currentValue;
        calculatedTotalInvested += item.investedAmount;

        // Calculate sector distribution
        const sector = fundToSectorMapping[item.fundId] || 'Other'; // Default to 'Other' if sector not found
        if (calculatedSectorDistribution[sector]) {
          calculatedSectorDistribution[sector] += currentValue;
        } else {
          calculatedSectorDistribution[sector] = currentValue;
        }
        calculatedFundAllocationData.push({
          name: `Fund ${item.fundId}`,
          value: currentValue,
        });
      });

      setTotalValue(calculatedTotalValue);
      setTotalInvested(calculatedTotalInvested);
      setOverallGainLoss(calculatedTotalValue - calculatedTotalInvested);

      setFundAllocationData(calculatedFundAllocationData);
      // Convert sector distribution object to array format for charting
      setSectorDistributionData(Object.keys(calculatedSectorDistribution).map(sector => ({
        name: sector,
        value: calculatedSectorDistribution[sector],
      })));
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
      // TODO: Navigate to login screen if using a navigation stack
      Alert.alert("Logged out", "You have been signed out successfully.");
      // TODO: Navigate to login screen if using a navigation stack
    } catch (e) {
      Alert.alert("Error", "Failed to log out.");
      console.error(e);
    }
  };

  // ➕ Handle Save (Add/Edit) Item
  const handleSaveItem = async (item: Partial<PortfolioItem>) => {
    const { fundId, investedAmount, units, id } = item;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is logged in.");
      return;
    }
    try {
      if (itemToEdit) {
        // Editing existing item
        const itemRef = doc(db, `users/${user.uid}/portfolio`, itemToEdit.id);
        await updateDoc(itemRef, {
          fundId: fundId,
          investedAmount: investedAmount,
          units: units,
        });
        Alert.alert("Success", "Portfolio item updated successfully.");
      } else {
        // Adding new item
 await addDoc(collection(db, `users/${user.uid}/portfolio`), {
          fundId: fundId,
          investedAmount: investedAmount,
          units: units,
        });
        Alert.alert("Success", "Portfolio item added successfully.");
      }
      // Data is automatically refreshed by onSnapshot listener
      setIsModalVisible(false); // Close modal after saving
    } catch (e: any) {
      Alert.alert("Error", `Failed to save portfolio item: ${e.message}`);
      console.error("Error saving portfolio item:", e);
      // Re-open modal if there was an error saving (optional)
      // setIsModalVisible(true);
    } finally {
      // setItemToEdit(null); // Clear itemToEdit state is handled in handleModalClose
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is logged in.");
      return;
    }

    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this portfolio item?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const itemRef = doc(db, `users/${user.uid}/portfolio`, itemId);
              await deleteDoc(itemRef);
 Alert.alert("Success", "Portfolio item deleted successfully."); // Data is automatically refreshed by onSnapshot listener
            } catch (e: any) {
              Alert.alert("Error", `Failed to delete portfolio item: ${e.message}`);
              console.error("Error deleting portfolio item:", e);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Function to handle modal close
  const handleModalClose = () => {
    setIsModalVisible(false);
    setItemToEdit(null); // Clear itemToEdit when modal is closed
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
              <View style={styles.portfolioItemContainer}>
                <Text>{`Fund ID: ${item.fundId}, Invested: ₹${item.investedAmount}, Units: ${item.units}`}</Text>
                <View style={styles.portfolioItemButtons}>
                  <TouchableOpacity onPress={() => {
                    setItemToEdit(item);
                    setIsModalVisible(true);
                  }}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    handleDeleteItem(item.id);
                  }}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text>No portfolio data found.</Text>}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fund Allocation</Text>
        {fundAllocationData.length > 0 && (
          <>
            <PieChart
            data={fundAllocationData.map((item, index) => ({ ...item, color: `rgba(131, 167, 234, ${index * 0.2 + 0.6})`, legendFontColor: "#7F7F7F", legendFontSize: 15 }))}
 width={Dimensions.get('window').width - 32} // Full width minus padding
 height={220}
 chartConfig={{
 backgroundColor: '#ffffff', // Corrected spelling
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
 decimalPlaces: 2, // optional, defaults to 2dp // Corrected spelling
 color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
 style: {
 borderRadius: 16,
 },
 }}
 // Added missing props
 accessor={"value"}
 backgroundColor={"transparent"}
 paddingLeft={"15"}
 absolute // Show percentage values
 />
 <Text>Total Value: ₹{totalValue.toFixed(2)}</Text></>)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sector Distribution</Text>
        {sectorDistributionData.length > 0 && (
          <PieChart
            data={sectorDistributionData.map((item, index) => ({ ...item, color: `rgba(200, 100, 100, ${index * 0.2 + 0.6})`, legendFontColor: "#7F7F7F", legendFontSize: 15 }))}
            width={Dimensions.get('window').width - 32} // Full width minus padding
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            accessor={"value"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute // Show percentage values
          />)}
      </View> {/* Added closing View tag */}
 <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Best Actions</Text>
        <Text>[🤖 Placeholder for AI Recommendations]</Text>
      </View>
      <View style={styles.section}>
        <Button title="Add Portfolio Item" onPress={() => setIsModalVisible(true)} />
      </View>

      <View style={styles.section}>
        <Button title="Logout" onPress={handleLogout} />
      </View>

      <ManagePortfolioItemModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSaveItem={handleSaveItem} // Use handleSaveItem for both add and edit
      />
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
  portfolioItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  portfolioItemButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButtonText: {
    color: 'blue',
  },
  deleteButtonText: {
    color: 'red',
  },
});
