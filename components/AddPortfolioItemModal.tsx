import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';

interface AddPortfolioItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItem: (fundId: string, investedAmount: number, units: number) => void;
}

const isPositiveNumber = (value: string) =>
  !isNaN(parseFloat(value)) && parseFloat(value) > 0;

const AddPortfolioItemModal: React.FC<AddPortfolioItemModalProps> = ({
  visible,
  onClose,
  onAddItem,
}) => {
  const [fundId, setFundId] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [units, setUnits] = useState('');

  // ✅ Missing state variables added
  const [investedAmountError, setInvestedAmountError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);

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

    if (fundId && isValid) {
      onAddItem(fundId, investedAmountNumber, unitsNumber);
      setFundId('');
      setInvestedAmount('');
      setUnits('');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Add Portfolio Item</Text>

              <TextInput
                style={styles.input}
                placeholder="Fund ID"
                value={fundId}
                onChangeText={setFundId}
              />

              <TextInput
                placeholder="Invested Amount"
                value={investedAmount}
                onChangeText={setInvestedAmount}
                keyboardType="numeric"
                style={[styles.input, investedAmountError && styles.inputError]}
              />
              {investedAmountError && (
                <Text style={styles.errorText}>{investedAmountError}</Text>
              )}

              <TextInput
                placeholder="Units"
                value={units}
                onChangeText={setUnits}
                keyboardType="numeric"
                style={[styles.input, unitsError && styles.inputError]}
              />
              {unitsError && (
                <Text style={styles.errorText}>{unitsError}</Text>
              )}

              <View style={styles.buttonContainer}>
                <Button
                  title="Add Item"
                  onPress={handleAddItem}
                  disabled={!fundId || investedAmountError !== null || unitsError !== null}
                />
                <Button title="Cancel" onPress={onClose} color="red" />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
});

export default AddPortfolioItemModal;
