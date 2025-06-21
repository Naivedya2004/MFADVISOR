import { API_URL } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  investmentGoal: string;
  preferredCategories: string[];
  notifications: {
    priceAlerts: boolean;
    portfolioUpdates: boolean;
    marketNews: boolean;
    dividendAlerts: boolean;
  };
  autoRebalancing: boolean;
  taxLossHarvesting: boolean;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/profile`);
      const data = await response.json();
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Create mock profile for demo
      const mockProfile: UserProfile = {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 98765 43210',
        riskProfile: 'Moderate',
        investmentGoal: 'Long-term wealth creation',
        preferredCategories: ['Equity', 'Debt', 'Hybrid'],
        notifications: {
          priceAlerts: true,
          portfolioUpdates: true,
          marketNews: false,
          dividendAlerts: true,
        },
        autoRebalancing: true,
        taxLossHarvesting: false,
      };
      setProfile(mockProfile);
      setEditedProfile(mockProfile);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!editedProfile) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProfile),
      });
      
      if (response.ok) {
        setProfile(editedProfile);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key: keyof UserProfile['notifications']) => {
    if (!editedProfile) return;
    
    setEditedProfile({
      ...editedProfile,
      notifications: {
        ...editedProfile.notifications,
        [key]: !editedProfile.notifications[key],
      },
    });
  };

  const handleSettingToggle = (key: 'autoRebalancing' | 'taxLossHarvesting') => {
    if (!editedProfile) return;
    
    setEditedProfile({
      ...editedProfile,
      [key]: !editedProfile[key],
    });
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={editedProfile?.name || ''}
          onChangeText={(text) => setEditedProfile(prev => prev ? { ...prev, name: text } : null)}
          editable={editing}
          placeholder="Enter your name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={editedProfile?.email || ''}
          onChangeText={(text) => setEditedProfile(prev => prev ? { ...prev, email: text } : null)}
          editable={editing}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={editedProfile?.phone || ''}
          onChangeText={(text) => setEditedProfile(prev => prev ? { ...prev, phone: text } : null)}
          editable={editing}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderInvestmentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Investment Preferences</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Risk Profile</Text>
        <View style={styles.riskProfileContainer}>
          {(['Conservative', 'Moderate', 'Aggressive'] as const).map((risk) => (
            <TouchableOpacity
              key={risk}
              style={[
                styles.riskButton,
                editedProfile?.riskProfile === risk && styles.selectedRiskButton,
                !editing && styles.disabledRiskButton
              ]}
              onPress={() => editing && setEditedProfile(prev => prev ? { ...prev, riskProfile: risk } : null)}
              disabled={!editing}
            >
              <Text style={[
                styles.riskButtonText,
                editedProfile?.riskProfile === risk && styles.selectedRiskButtonText
              ]}>
                {risk}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Investment Goal</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={editedProfile?.investmentGoal || ''}
          onChangeText={(text) => setEditedProfile(prev => prev ? { ...prev, investmentGoal: text } : null)}
          editable={editing}
          placeholder="Enter your investment goal"
          multiline
        />
      </View>
    </View>
  );

  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      
      {Object.entries(editedProfile?.notifications || {}).map(([key, value]) => (
        <View key={key} style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Text>
            <Text style={styles.settingDescription}>
              {getNotificationDescription(key as keyof UserProfile['notifications'])}
            </Text>
          </View>
          <Switch
            value={value}
            onValueChange={() => handleNotificationToggle(key as keyof UserProfile['notifications'])}
            disabled={!editing}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={value ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      ))}
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Settings</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Auto Rebalancing</Text>
          <Text style={styles.settingDescription}>
            Automatically rebalance portfolio based on target allocation
          </Text>
        </View>
        <Switch
          value={editedProfile?.autoRebalancing || false}
          onValueChange={() => handleSettingToggle('autoRebalancing')}
          disabled={!editing}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={editedProfile?.autoRebalancing ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Tax Loss Harvesting</Text>
          <Text style={styles.settingDescription}>
            Automatically harvest tax losses to optimize tax efficiency
          </Text>
        </View>
        <Switch
          value={editedProfile?.taxLossHarvesting || false}
          onValueChange={() => handleSettingToggle('taxLossHarvesting')}
          disabled={!editing}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={editedProfile?.taxLossHarvesting ? '#007AFF' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const getNotificationDescription = (key: keyof UserProfile['notifications']) => {
    const descriptions = {
      priceAlerts: 'Get notified when fund prices change significantly',
      portfolioUpdates: 'Receive daily/weekly portfolio performance updates',
      marketNews: 'Get market news and analysis updates',
      dividendAlerts: 'Get notified when dividends are declared',
    };
    return descriptions[key];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile & Settings</Text>
        <View style={styles.headerActions}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.cancelButton} onPress={() => {
                setEditedProfile(profile);
                setEditing(false);
              }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderProfileSection()}
      {renderInvestmentSection()}
      {renderNotificationsSection()}
      {renderSettingsSection()}

      {/* Additional Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Export', 'Export portfolio data')}>
          <Text style={styles.actionButtonText}>Export Portfolio Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Backup', 'Backup settings')}>
          <Text style={styles.actionButtonText}>Backup Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]} 
          onPress={() => Alert.alert('Delete Account', 'Are you sure you want to delete your account?')}
        >
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f9f9f9',
    color: '#666',
  },
  riskProfileContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  riskButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedRiskButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  disabledRiskButton: {
    backgroundColor: '#f9f9f9',
  },
  riskButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedRiskButtonText: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
  },
  dangerButtonText: {
    color: '#e53e3e',
  },
}); 