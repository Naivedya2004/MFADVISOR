import ManagePortfolioItemModal from '@/components/ManagePortfolioItemModal';
import usePortfolio from '@/hooks/usePortfolio';
import { PortfolioItem } from '@/types';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

// Removed the mock fundToSectorMapping as we will now use actual category from MFAPI


export default function PortfolioScreen() {
  console.log("Rendering PortfolioScreen");
  // Destructure fundDetails instead of fundNavs
  const { portfolio, loading, error, fundDetails, navLoading, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = usePortfolio();
  const [modalVisible, setModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PortfolioItem | null>(null);

  // --- Analytics calculations using real NAVs and categories ---
  const { totalValue, totalInvested, overallGainLoss, fundAllocationData, sectorDistributionData } = useMemo(() => {
    let calculatedTotalValue = 0;
    let calculatedTotalInvested = 0;
    const calculatedFundAllocationData: any[] = [];
    const calculatedSectorDistribution: { [sector: string]: number } = {};

    portfolio.forEach(item => {
      // Get NAV and category from fundDetails
      const fundDetail = fundDetails[item.fundId];
      const latestNav = fundDetail?.nav;
      const category = fundDetail?.category;
      
      const currentValue = latestNav ? item.units * latestNav : 0; // Use 0 if NAV not available
      
      calculatedTotalValue += currentValue;
      calculatedTotalInvested += item.investedAmount;

      // Fund allocation
      calculatedFundAllocationData.push({
        name: `${item.fundId}`, // Display AMFI code for now, can fetch name later
        value: currentValue,
      });

      // Sector distribution: Use the actual category from MFAPI
      const sector = category || 'Uncategorized'; // Default to 'Uncategorized' if category not available
      if (calculatedSectorDistribution[sector]) {
        calculatedSectorDistribution[sector] += currentValue;
      } else {
        calculatedSectorDistribution[sector] = currentValue;
      }
    });

    const calculatedOverallGainLoss = calculatedTotalValue - calculatedTotalInvested;

    return {
      totalValue: calculatedTotalValue,
      totalInvested: calculatedTotalInvested,
      overallGainLoss: calculatedOverallGainLoss,
      fundAllocationData: calculatedFundAllocationData,
      sectorDistributionData: Object.keys(calculatedSectorDistribution).map(sector => ({
        name: sector,
        value: calculatedSectorDistribution[sector],
      })),
    };
  }, [portfolio, fundDetails]); // Recalculate when portfolio or fundDetails change

  // --- Portfolio item management handlers ---
  const handleAdd = () => {
    setItemToEdit(null);
    setModalVisible(true);
  };
  const handleEdit = (item: PortfolioItem) => {
    setItemToEdit(item);
    setModalVisible(true);
  };
  const handleSaveItem = async (item: Partial<PortfolioItem>) => {
    try {
      if (item.id) {
        await updatePortfolioItem(item as PortfolioItem);
        Alert.alert("Success", "Portfolio item updated!");
      } else {
        await addPortfolioItem(item as Omit<PortfolioItem, 'id'>);
        Alert.alert("Success", "Portfolio item added!");
      }
    } catch (e: any) {
      Alert.alert("Error", `Failed to save item: ${e.message}`);
      console.error("Save item error:", e);
    } finally {
      setModalVisible(false);
      setItemToEdit(null);
    }
  };
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this portfolio item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              Alert.alert("Success", "Portfolio item deleted!");
            } catch (e: any) {
              Alert.alert("Error", `Failed to delete item: ${e.message}`);
              console.error("Delete item error:", e);
            }
          },
        },
      ]
    );
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text>Debug: PortfolioScreen is rendering</Text>
        <Text style={styles.title}>Portfolio Overview</Text>
        <Button title="Add Portfolio Item" onPress={handleAdd} />

        {/* --- Analytics Summary --- */}
        {(loading || navLoading) && <ActivityIndicator size="large" color="#007AFF" style={styles.activityIndicator} />}
        {error && <Text style={styles.error}>{error}</Text>}
        
        {!loading && !error && (
          <View style={styles.analyticsSummary}>
            <Text style={styles.analyticsText}>Total Invested: ₹{totalInvested.toFixed(2)}</Text>
            <Text style={styles.analyticsText}>Current Value: ₹{totalValue.toFixed(2)}</Text>
            <Text style={[styles.analyticsText, { color: overallGainLoss >= 0 ? 'green' : 'red' }]}>
              Gain/Loss: ₹{overallGainLoss.toFixed(2)}
            </Text>
          </View>
        )}

        {/* --- Fund Allocation Pie Chart --- */}
        {!loading && !error && fundAllocationData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Fund Allocation</Text>
            <PieChart
              data={fundAllocationData.map((item, index) => ({
                ...item,
                color: `rgba(131, 167, 234, ${(index * 0.2 + 0.6) % 1})`, // Dynamic color
                legendFontColor: "#7F7F7F",
                legendFontSize: 15
              }))}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={chartConfig}
              accessor={"value"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute // Show percentage values
            />
          </View>
        )}

        {/* --- Sector Distribution Pie Chart --- */}
        {!loading && !error && sectorDistributionData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Sector Distribution</Text>
            <PieChart
              data={sectorDistributionData.map((item, index) => ({
                ...item,
                color: `rgba(200, 100, 100, ${(index * 0.2 + 0.6) % 1})`, // Dynamic color
                legendFontColor: "#7F7F7F",
                legendFontSize: 15
              }))}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={chartConfig}
              accessor={"value"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute
            />
          </View>
        )}

        {/* --- Portfolio List --- */}
        {!loading && !error && (
          <View style={styles.portfolioListContainer}>
            <Text style={styles.sectionTitle}>Your Holdings</Text>
            <FlatList
              data={portfolio}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                // Get NAV and category from fundDetails
                const fundDetail = fundDetails[item.fundId];
                const latestNav = fundDetail?.nav;
                const currentValue = latestNav ? item.units * latestNav : 0;
                const itemGainLoss = currentValue - item.investedAmount;
                const isPositiveGain = itemGainLoss >= 0;

                return (
                  <View style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemText}>Fund Code: {item.fundId}</Text>
                      {fundDetail?.category && <Text style={styles.itemText}>Category: {fundDetail.category}</Text>}
                      <Text style={styles.itemText}>Invested: ₹{item.investedAmount.toFixed(2)}</Text>
                      <Text style={styles.itemText}>Units: {item.units.toFixed(4)}</Text>
                      {latestNav && <Text style={styles.itemText}>Latest NAV: ₹{latestNav.toFixed(2)}</Text>}
                      <Text style={styles.itemText}>Current Value: ₹{currentValue.toFixed(2)}</Text>
                      <Text style={[styles.itemText, { color: isPositiveGain ? 'green' : 'red' }]}>
                        Gain/Loss: ₹{itemGainLoss.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => handleEdit(item)}>
                        <Text style={styles.edit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Text style={styles.delete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No portfolio data found. Add an item to get started!</Text>
              }
            />
          </View>
        )}

        <ManagePortfolioItemModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setItemToEdit(null); }}
          onSaveItem={handleSaveItem}
          itemToEdit={itemToEdit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  analyticsSummary: { marginVertical: 16, alignItems: 'center', width: '100%', padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  analyticsText: { fontSize: 16, marginBottom: 4 },
  chartSection: { marginVertical: 16, alignItems: 'center', width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start', marginLeft: 10 },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
  activityIndicator: { marginVertical: 20 },
  portfolioListContainer: { width: '100%', marginTop: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 14,
    marginBottom: 2,
  },
  actions: { flexDirection: 'row', gap: 10 },
  edit: { color: 'blue', marginRight: 10 },
  delete: { color: 'red' },
  emptyListText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
});