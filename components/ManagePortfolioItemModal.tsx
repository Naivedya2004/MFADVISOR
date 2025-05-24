import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, TouchableWithoutFeedback } from 'react-native';
// 👇 Replace with correct path where PortfolioItem is defined
// Or define it locally for testing:
interface PortfolioItem {
  id: string;
  fundId: string;
  investedAmount: number;
  units: number;
}

interface ManagePortfolioItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveItem: (item: Partial<PortfolioItem>) => void;
  itemToEdit?: PortfolioItem | null;
}

const isPositiveNumber = (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) > 0;

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

  const isEditing = !!itemToEdit;

  useEffect(() => {
    if (itemToEdit) {
      setFundId(itemToEdit.fundId);
      setInvestedAmount(itemToEdit.investedAmount.toString());
      setUnits(itemToEdit.units.toString());
    } else {
      setFundId('');
      setInvestedAmount('');
      setUnits('');
    }
  }, [itemToEdit]);

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
      const itemData: Partial<PortfolioItem> = {
        fundId: fundId,
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
    } else if (!fundId && isValid) {
      console.warn('Please fill in Fund ID.');
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Fund ID"
                value={fundId}
                onChangeText={setFundId}
              />

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
});
