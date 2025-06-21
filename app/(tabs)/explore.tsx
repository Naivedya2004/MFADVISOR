import { auth } from '@/firebaseConfig';
import { getPopularFunds, getRecommendations } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Fund {
  fund_id: string;
  fund_house?: string;
  fund_category?: string;
  scheme_name?: string;
  expense_ratio?: number;
  nav?: number;
  [key: string]: any;
}

const TABS = ['Popular', 'Recommended'] as const;

type TabType = typeof TABS[number];

export default function ExploreScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Popular');
  const [popularFunds, setPopularFunds] = useState<Fund[]>([]);
  const [recommendedFunds, setRecommendedFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    fetchFunds();
  }, [activeTab, user]);

  const fetchFunds = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'Popular') {
        const data = await getPopularFunds();
        setPopularFunds(data);
      } else if (activeTab === 'Recommended') {
        if (!user) throw new Error('No user is logged in.');
        const data = await getRecommendations(user.uid);
        setRecommendedFunds(data);
      }
    } catch (e: any) {
      setError('Failed to load funds.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFundPress = (fund: Fund) => {
    Alert.alert(
      fund.scheme_name || fund.fund_id,
      `Category: ${fund.fund_category || 'N/A'}\nNAV: ₹${fund.nav?.toFixed(2) || 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add to Portfolio', onPress: () => addToPortfolio(fund) }
      ]
    );
  };

  const addToPortfolio = (fund: Fund) => {
    // Placeholder: In a real app, navigate to portfolio add modal
    Alert.alert('Success', `${fund.scheme_name || fund.fund_id} selected for portfolio addition`);
  };

  const renderFundItem = ({ item }: { item: Fund }) => (
    <TouchableOpacity style={styles.fundItem} onPress={() => handleFundPress(item)}>
      <View style={styles.fundHeader}>
        <Text style={styles.fundName} numberOfLines={2}>{item.scheme_name || item.fund_id}</Text>
        <Text style={styles.fundCode}>{item.fund_id}</Text>
      </View>
      <View style={styles.fundDetails}>
        <Text style={styles.category}>{item.fund_category || 'N/A'}</Text>
        <Text style={styles.nav}>₹{item.nav?.toFixed(2) || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Funds</Text>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Fund List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading funds...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'Popular' ? popularFunds : recommendedFunds}
          renderItem={renderFundItem}
          keyExtractor={item => item.fund_id}
          style={styles.fundsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No funds found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', marginBottom: 16, justifyContent: 'center' },
  tabButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginHorizontal: 8, borderWidth: 1, borderColor: '#ddd' },
  activeTabButton: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  tabButtonText: { color: '#333', fontSize: 16 },
  activeTabButtonText: { color: '#fff', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#F44336', fontSize: 16 },
  fundsList: { flex: 1 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 32, fontSize: 16 },
  fundItem: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  fundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fundName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  fundCode: { fontSize: 14, color: '#888', marginLeft: 8 },
  fundDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  category: { fontSize: 14, color: '#888' },
  nav: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
});
