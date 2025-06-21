import usePortfolio from '@/hooks/usePortfolio';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

interface AnalyticsData {
  totalValue: number;
  totalInvested: number;
  overallGainLoss: number;
  gainLossPercentage: number;
  fundAllocationData: any[];
  sectorDistributionData: any[];
  monthlyPerformance: any[];
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
  };
}

export default function AnalyticsScreen() {
  const { portfolio, loading, error, fundDetails, navLoading } = usePortfolio();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    style: { borderRadius: 16 },
  };

  // Calculate analytics data
  useEffect(() => {
    if (portfolio.length > 0 && Object.keys(fundDetails).length > 0) {
      const data = calculateAnalytics();
      setAnalyticsData(data);
    }
  }, [portfolio, fundDetails, selectedTimeframe]);

  const calculateAnalytics = (): AnalyticsData => {
    let totalValue = 0;
    let totalInvested = 0;
    const fundAllocationData: any[] = [];
    const sectorDistribution: { [sector: string]: number } = {};

    portfolio.forEach(item => {
      const fundDetail = fundDetails[item.fundId];
      const latestNav = fundDetail?.nav;
      const category = fundDetail?.category;
      
      const currentValue = latestNav ? item.units * latestNav : 0;
      totalValue += currentValue;
      totalInvested += item.investedAmount;

      // Fund allocation
      fundAllocationData.push({
        name: item.fundId,
        value: currentValue,
        color: `rgba(131, 167, 234, ${(fundAllocationData.length * 0.2 + 0.6) % 1})`,
        legendFontColor: "#7F7F7F",
        legendFontSize: 12
      });

      // Sector distribution
      const sector = category || 'Uncategorized';
      if (sectorDistribution[sector]) {
        sectorDistribution[sector] += currentValue;
      } else {
        sectorDistribution[sector] = currentValue;
      }
    });

    const overallGainLoss = totalValue - totalInvested;
    const gainLossPercentage = totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;

    // Mock monthly performance data (in real app, this would come from historical NAVs)
    const monthlyPerformance = [
      { month: 'Jan', value: totalValue * 0.95 },
      { month: 'Feb', value: totalValue * 0.98 },
      { month: 'Mar', value: totalValue * 1.02 },
      { month: 'Apr', value: totalValue * 0.99 },
      { month: 'May', value: totalValue * 1.05 },
      { month: 'Jun', value: totalValue },
    ];

    // Mock risk metrics (in real app, these would be calculated from historical data)
    const riskMetrics = {
      volatility: 12.5, // Annualized volatility percentage
      sharpeRatio: 1.2, // Risk-adjusted return
      maxDrawdown: -8.5, // Maximum historical drawdown percentage
      beta: 0.85, // Market correlation
    };

    return {
      totalValue,
      totalInvested,
      overallGainLoss,
      gainLossPercentage,
      fundAllocationData,
      sectorDistributionData: Object.keys(sectorDistribution).map(sector => ({
        name: sector,
        value: sectorDistribution[sector],
        color: `rgba(200, 100, 100, ${Object.keys(sectorDistribution).indexOf(sector) * 0.2 + 0.6})`,
        legendFontColor: "#7F7F7F",
        legendFontSize: 12
      })),
      monthlyPerformance,
      riskMetrics,
    };
  };

  const renderTimeframeButton = (timeframe: '1M' | '3M' | '6M' | '1Y' | 'ALL') => (
    <TouchableOpacity
      key={timeframe}
      style={[
        styles.timeframeButton,
        selectedTimeframe === timeframe && styles.selectedTimeframeButton
      ]}
      onPress={() => setSelectedTimeframe(timeframe)}
    >
      <Text style={[
        styles.timeframeButtonText,
        selectedTimeframe === timeframe && styles.selectedTimeframeButtonText
      ]}>
        {timeframe}
      </Text>
    </TouchableOpacity>
  );

  if (loading || navLoading) {
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

  if (!analyticsData) {
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

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        <Text style={styles.sectionTitle}>Time Period</Text>
        <View style={styles.timeframeButtons}>
          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(renderTimeframeButton)}
        </View>
      </View>

      {/* Performance Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>₹{analyticsData.totalValue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Invested</Text>
            <Text style={styles.summaryValue}>₹{analyticsData.totalInvested.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gain/Loss</Text>
            <Text style={[
              styles.summaryValue,
              { color: analyticsData.overallGainLoss >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              ₹{analyticsData.overallGainLoss.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Return %</Text>
            <Text style={[
              styles.summaryValue,
              { color: analyticsData.gainLossPercentage >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {analyticsData.gainLossPercentage.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Monthly Performance Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Monthly Performance</Text>
        <LineChart
          data={{
            labels: analyticsData.monthlyPerformance.map(item => item.month),
            datasets: [{
              data: analyticsData.monthlyPerformance.map(item => item.value)
            }]
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Fund Allocation Chart */}
      {analyticsData.fundAllocationData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Fund Allocation</Text>
          <PieChart
            data={analyticsData.fundAllocationData}
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

      {/* Sector Distribution Chart */}
      {analyticsData.sectorDistributionData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Sector Distribution</Text>
          <PieChart
            data={analyticsData.sectorDistributionData}
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

      {/* Risk Metrics */}
      <View style={styles.riskSection}>
        <Text style={styles.sectionTitle}>Risk Metrics</Text>
        <View style={styles.riskGrid}>
          <View style={styles.riskCard}>
            <Text style={styles.riskLabel}>Volatility</Text>
            <Text style={styles.riskValue}>{analyticsData.riskMetrics.volatility}%</Text>
            <Text style={styles.riskDescription}>Annualized</Text>
          </View>
          <View style={styles.riskCard}>
            <Text style={styles.riskLabel}>Sharpe Ratio</Text>
            <Text style={styles.riskValue}>{analyticsData.riskMetrics.sharpeRatio}</Text>
            <Text style={styles.riskDescription}>Risk-adjusted return</Text>
          </View>
          <View style={styles.riskCard}>
            <Text style={styles.riskLabel}>Max Drawdown</Text>
            <Text style={[styles.riskValue, { color: '#F44336' }]}>
              {analyticsData.riskMetrics.maxDrawdown}%
            </Text>
            <Text style={styles.riskDescription}>Historical low</Text>
          </View>
          <View style={styles.riskCard}>
            <Text style={styles.riskLabel}>Beta</Text>
            <Text style={styles.riskValue}>{analyticsData.riskMetrics.beta}</Text>
            <Text style={styles.riskDescription}>Market correlation</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  timeframeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeframeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedTimeframeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeframeButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTimeframeButtonText: {
    color: '#fff',
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chartSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  riskSection: {
    marginBottom: 20,
  },
  riskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  riskCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  riskLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  riskValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  riskDescription: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
}); 