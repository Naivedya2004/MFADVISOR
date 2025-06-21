import { auth } from '@/firebaseConfig';
import { getTransactions } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Transaction {
  id: number;
  fund_id: string;
  type: 'buy' | 'sell';
  units: number;
  amount: number;
  nav: number;
  date: string;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const user = auth.currentUser;

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, selectedType, selectedPeriod, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      if (!user) throw new Error('No user is logged in.');
      const data = await getTransactions(user.uid);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;
    if (selectedType !== 'All') {
      filtered = filtered.filter(tx => tx.type === selectedType.toLowerCase());
    }
    if (selectedPeriod !== 'All') {
      const now = new Date();
      const periodMap = {
        '1M': new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
        '3M': new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        '6M': new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        '1Y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      };
      if (periodMap[selectedPeriod as keyof typeof periodMap]) {
        const cutoffDate = periodMap[selectedPeriod as keyof typeof periodMap];
        filtered = filtered.filter(tx => new Date(tx.date) >= cutoffDate);
      }
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(tx =>
        tx.fund_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTransactions(filtered);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'buy': return '#4CAF50';
      case 'sell': return '#F44336';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => showTransactionDetails(item)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.fundName} numberOfLines={1}>
            {item.fund_id}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.transactionTypeContainer}>
          <Text style={[
            styles.transactionType,
            { color: getTransactionTypeColor(item.type) }
          ]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Units:</Text>
          <Text style={styles.detailValue}>{item.units.toFixed(4)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>NAV:</Text>
          <Text style={styles.detailValue}>₹{item.nav.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={[styles.detailValue, styles.amountValue]}>
            {formatAmount(item.amount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const showTransactionDetails = (transaction: Transaction) => {
    Alert.alert(
      'Transaction Details',
      `Fund: ${transaction.fund_id}\n` +
      `Type: ${transaction.type.toUpperCase()}\n` +
      `Date: ${formatDate(transaction.date)}\n` +
      `Units: ${transaction.units.toFixed(4)}\n` +
      `NAV: ₹${transaction.nav.toFixed(2)}\n` +
      `Amount: ${formatAmount(transaction.amount)}`,
      [{ text: 'OK' }]
    );
  };

  const renderFilterButton = (label: string, value: string, currentValue: string, onPress: (value: string) => void) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        currentValue === value && styles.selectedFilterButton
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterButtonText,
        currentValue === value && styles.selectedFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const calculateSummary = () => {
    const summary = {
      totalBuy: 0,
      totalSell: 0,
      totalTransactions: filteredTransactions.length,
    };

    filteredTransactions.forEach(tx => {
      if (tx.type === 'buy') {
        summary.totalBuy += tx.amount;
      } else if (tx.type === 'sell') {
        summary.totalSell += tx.amount;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by fund code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Type</Text>
          <View style={styles.filterButtons}>
            {renderFilterButton('All', 'All', selectedType, setSelectedType)}
            {renderFilterButton('Buy', 'buy', selectedType, setSelectedType)}
            {renderFilterButton('Sell', 'sell', selectedType, setSelectedType)}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Period</Text>
          <View style={styles.filterButtons}>
            {renderFilterButton('All', 'All', selectedPeriod, setSelectedPeriod)}
            {renderFilterButton('1M', '1M', selectedPeriod, setSelectedPeriod)}
            {renderFilterButton('3M', '3M', selectedPeriod, setSelectedPeriod)}
            {renderFilterButton('6M', '6M', selectedPeriod, setSelectedPeriod)}
            {renderFilterButton('1Y', '1Y', selectedPeriod, setSelectedPeriod)}
          </View>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Transactions:</Text>
          <Text style={styles.summaryValue}>{summary.totalTransactions}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Buy:</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            {formatAmount(summary.totalBuy)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Sell:</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>
            {formatAmount(summary.totalSell)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTransactionItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found.</Text>}
      />
    </View>
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedFilterButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedFilterButtonText: {
    color: '#fff',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  fundName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionTypeContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  transactionType: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  amountValue: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
}); 