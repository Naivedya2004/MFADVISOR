import { PortfolioItem } from '@/types'; // Ensure PortfolioItem is imported from your types file
import { PY_API_URL } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface ManagePortfolioItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveItem: (item: Partial<PortfolioItem>) => void;
  itemToEdit?: PortfolioItem | null;
}

// Helper function to validate positive numbers
const isPositiveNumber = (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) > 0;

// Corrected Helper function for preprocessing text (similar to Python script, but in JS/TS)
const preprocess = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ''); // Removes non-alphanumeric and non-whitespace characters
};

const ManagePortfolioItemModal: React.FC<ManagePortfolioItemModalProps> = ({
  visible,
  onClose,
  onSaveItem,
  itemToEdit,
}) => {
  const [fundId, setFundId] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [units, setUnits] = useState('');
  const [investedAmountError, setInvestedAmountError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  // New states for fund name normalization
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedAmfiCode, setSelectedAmfiCode] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEditing = !!itemToEdit;

  useEffect(() => {
    if (itemToEdit) {
      setFundId(itemToEdit.fundId);
      setInvestedAmount(itemToEdit.investedAmount.toString());
      setUnits(itemToEdit.units.toString());
      // When editing, if fundId is an AMFI code, pre-select it
      setSelectedAmfiCode(itemToEdit.fundId);
    } else {
      setFundId('');
      setInvestedAmount('');
      setUnits('');
      setSelectedAmfiCode(null);
    }
    // Clear suggestions when modal opens/closes or itemToEdit changes
    setSuggestions([]);
    setShowSuggestions(false);
  }, [itemToEdit, visible]);

  // Debounce effect for fund name search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if not editing AND input is long enough AND current fundId is not already a selected AMFI code
      if (fundId.length > 2 && !isEditing && fundId !== selectedAmfiCode) {
        fetchFundSuggestions(fundId);
      } else {
        setSuggestions([]);
        setLoadingSuggestions(false);
      }
    }, 500); // Debounce time
    return () => clearTimeout(timer);
  }, [fundId, isEditing, selectedAmfiCode]); // Added selectedAmfiCode to dependencies

  const fetchFundSuggestions = async (input: string) => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const response = await fetch(`${PY_API_URL}/normalize?input=${encodeURIComponent(input)}`);
      const data = await response.json();
      if (data && data.matched_name) {
        const newSuggestions = [
          // Best match first
          { name: `${data.matched_name} (${data.amfi_code})`, amfi_code: data.amfi_code, isBestMatch: true, score: data.score },
          // Then other close matches, filtering out the best match if it's already there
          ...(data.close_matches || [])
            .filter((match: string) => preprocess(match) !== preprocess(data.matched_name))
            .map((match: string) => ({
              name: match, amfi_code: null, isBestMatch: false, score: null // No AMFI code for close matches by default from API
            }))
        ];
        setSuggestions(newSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching fund suggestions:", error);
      setSuggestions([]);
      Alert.alert("API Error", "Could not fetch fund suggestions. Is the Python API running?");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setFundId(suggestion.name); // Set the display name
    setSelectedAmfiCode(suggestion.amfi_code); // Store the AMFI code
    setShowSuggestions(false); // Hide suggestions after selection
  };

  const handleAddItem = () => {
    let isValid = true;

    if (!isPositiveNumber(investedAmount)) {
      setInvestedAmountError('Please enter a valid positive number.');
      isValid = false;
    } else {
      setInvestedAmountError(null);
    }

    if (!isPositiveNumber(units)) {
      setUnitsError('Please enter a valid positive number.');
      isValid = false;
    } else {
      setUnitsError(null);
    }

    const investedAmountNumber = parseFloat(investedAmount);
    const unitsNumber = parseFloat(units);

    // Use the selectedAmfiCode if available, otherwise fallback to current fundId (which might be raw input)
    const finalFundIdentifier = selectedAmfiCode || fundId;

    if (finalFundIdentifier && isValid) {
      const itemData: Partial<PortfolioItem> = {
        fundId: finalFundIdentifier, // Use the selected AMFI code or typed name
        investedAmount: investedAmountNumber,
        units: unitsNumber,
      };
      if (isEditing && itemToEdit) {
        itemData.id = itemToEdit.id;
      }
      onSaveItem(itemData);
      setFundId('');
      setInvestedAmount('');
      setUnits('');
      setInvestedAmountError(null);
      setUnitsError(null);
      setSelectedAmfiCode(null); // Clear selected AMFI code
      onClose(); // Close modal after successful save
    } else if (!finalFundIdentifier) { // Check if fundId is empty after considering selectedAmfiCode
      Alert.alert('Validation Error', 'Please enter a Fund Name or select from suggestions.');
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={() => { onClose(); setShowSuggestions(false); }}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Fund Name or AMFI Code"
                value={fundId}
                onChangeText={(text) => {
                  setFundId(text);
                  // Clear previously selected AMFI code if user types again
                  if (selectedAmfiCode && text !== selectedAmfiCode) {
                    setSelectedAmfiCode(null);
                  }
                  setShowSuggestions(true); // Show suggestions again on typing
                }}
                onFocus={() => setShowSuggestions(true)} // Show suggestions when input is focused
              />
              {loadingSuggestions && <ActivityIndicator size="small" color="#007AFF" />}
              {showSuggestions && suggestions.length > 0 && (
                <FlatList
                  style={styles.suggestionsContainer}
                  data={suggestions}
                  keyExtractor={(item, index) => `${item.name}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.suggestionItem, item.isBestMatch && styles.bestMatchSuggestion]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Text style={item.isBestMatch ? styles.bestMatchText : styles.suggestionText}>
                        {item.name} {item.score ? `(Score: ${item.score.toFixed(1)})` : ''}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TextInput
                style={[styles.input, investedAmountError && styles.inputError]}
                placeholder="Invested Amount"
                value={investedAmount}
                onChangeText={setInvestedAmount}
                keyboardType="numeric"
              />
              {investedAmountError && (
                <Text style={styles.errorText}>{investedAmountError}</Text>
              )}

              <TextInput
                style={[styles.input, unitsError && styles.inputError]}
                placeholder="Units"
                value={units}
                onChangeText={setUnits}
                keyboardType="numeric"
              />
              {unitsError && <Text style={styles.errorText}>{unitsError}</Text>}

              <View style={styles.buttonContainer}>
                <Button
                  title={isEditing ? 'Save Item' : 'Add Item'}
                  onPress={handleAddItem}
                  // Disable if no fund ID/AMFI code is set OR if there are input errors
                  disabled={!fundId || (!selectedAmfiCode && !fundId.length && !isEditing) || investedAmountError !== null || unitsError !== null}
                />
                <Button title="Cancel" onPress={() => { onClose(); setShowSuggestions(false); }} color="red" />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ManagePortfolioItemModal;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    width: '100%',
    borderRadius: 5,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  suggestionsContainer: {
    maxHeight: 150, // Limit height to make it scrollable
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  bestMatchSuggestion: {
    backgroundColor: '#e0e0ff', // Highlight best match
  },
  suggestionText: {
    fontSize: 16,
  },
  bestMatchText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});