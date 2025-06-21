import { API_URL } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Fund {
  scheme_code: string;
  scheme_name: string;
  category: string;
  nav_value: number;
  nav_date: string;
}

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [filteredFunds, setFilteredFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadFunds();
  }, []);

  useEffect(() => {
    filterFunds();
  }, [searchQuery, selectedCategory, funds]);

  const loadFunds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/funds`);
      const data = await response.json();
      setFunds(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map((fund: Fund) => fund.category))].sort() as string[];
      setCategories(['All', ...uniqueCategories]);
    } catch (error) {
      console.error('Error loading funds:', error);
      Alert.alert('Error', 'Failed to load funds');
    } finally {
      setLoading(false);
    }
  };

  const filterFunds = () => {
    let filtered = funds;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(fund => fund.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(fund => 
        fund.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fund.scheme_code.includes(searchQuery)
      );
    }

    setFilteredFunds(filtered);
  };

  const handleFundPress = (fund: Fund) => {
    Alert.alert(
      fund.scheme_name,
      `Category: ${fund.category}\nNAV: ₹${fund.nav_value?.toFixed(2) || 'N/A'}\nDate: ${fund.nav_date || 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add to Portfolio', onPress: () => addToPortfolio(fund) }
      ]
    );
  };

  const addToPortfolio = (fund: Fund) => {
    // Navigate to portfolio with pre-filled fund data
    // This would typically use navigation.navigate with params
    Alert.alert('Success', `${fund.scheme_name} selected for portfolio addition`);
  };

  const renderFundItem = ({ item }: { item: Fund }) => (
    <TouchableOpacity style={styles.fundItem} onPress={() => handleFundPress(item)}>
      <View style={styles.fundHeader}>
        <Text style={styles.fundName} numberOfLines={2}>{item.scheme_name}</Text>
        <Text style={styles.fundCode}>{item.scheme_code}</Text>
      </View>
      <View style={styles.fundDetails}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.nav}>₹{item.nav_value?.toFixed(2) || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryButton = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category && styles.selectedCategoryButtonText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading funds...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fund Search & Explore</Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search funds by name or code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(renderCategoryButton)}
        </ScrollView>
      </View>

      {/* Results Summary */}
      <View style={styles.resultsSummary}>
        <Text style={styles.resultsText}>
          {filteredFunds.length} funds found
        </Text>
      </View>

      {/* Funds List */}
      <FlatList
        data={filteredFunds}
        renderItem={renderFundItem}
        keyExtractor={(item) => item.scheme_code}
        style={styles.fundsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No funds found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or category filter</Text>
          </View>
        }
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
    marginBottom: 20,
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
  categoryContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#333',
    fontSize: 14,
  },
  selectedCategoryButtonText: {
    color: '#fff',
  },
  resultsSummary: {
    marginBottom: 15,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  fundsList: {
    flex: 1,
  },
  fundItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  fundHeader: {
    marginBottom: 8,
  },
  fundName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fundCode: {
    fontSize: 12,
    color: '#666',
  },
  fundDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  nav: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
});
