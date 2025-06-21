import { auth } from '@/firebaseConfig';
import { getPortfolioAnalytics } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) {
        setError('No user is logged in.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getPortfolioAnalytics(user.uid);
        setAnalytics(data);
      } catch (e: any) {
        setError('Failed to load analytics.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    style: { borderRadius: 16 },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No portfolio data available</Text>
        <Text style={styles.emptySubtext}>Add funds to your portfolio to see analytics</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Portfolio Analytics</Text>

      {/* Performance Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>₹{analytics.current_value.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Invested</Text>
            <Text style={styles.summaryValue}>₹{analytics.total_invested.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gain/Loss</Text>
            <Text style={[
              styles.summaryValue,
              { color: analytics.gain_loss >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              ₹{analytics.gain_loss.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Fund Allocation Chart */}
      {analytics.allocation.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Fund Allocation</Text>
          <PieChart
            data={analytics.allocation.map((item: any, idx: number) => ({
              name: item.fund_id,
              value: item.current_value,
              color: `rgba(131, 167, 234, ${(idx * 0.2 + 0.6) % 1})`,
              legendFontColor: "#7F7F7F",
              legendFontSize: 12
            }))}
            width={Dimensions.get('window').width - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  summaryContainer: { marginVertical: 16, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryCard: { width: '48%', marginBottom: 12, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12 },
  summaryLabel: { fontSize: 14, color: '#888' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  chartSection: { marginVertical: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#888' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: '#F44336', fontSize: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#888' },
  emptySubtext: { fontSize: 14, color: '#aaa', marginTop: 8 },
}); 