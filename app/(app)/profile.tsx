import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { auth } from '@/utils/firebaseAuth'; // Adjust the import path as needed
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'; // Adjust the import path as needed
import { updatePassword } from 'firebase/auth'; // Adjust the import path as needed
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState(auth.currentUser);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic password change validation
  const isPasswordChangeValid = newPassword.length >= 6;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        const db = getFirestore();
        const userDocRef = doc(db, `users/${user.uid}`);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setDisplayName(userData.displayName || '');
          setBio(userData.bio || '');
        }
      } catch (err: any) {
        console.error("Error fetching user profile:", err);
        setError("Failed to fetch profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]); // Refetch profile when user changes

  const handleUpdateProfile = async () => {
    if (!user) {
      setError("No user is logged in.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const db = getFirestore();
      const userDocRef = doc(db, `users/${user.uid}`);
      await updateDoc(userDocRef, {
        displayName: displayName,
        bio: bio,
      });
      // Optionally show a success message
      console.log("Profile updated successfully!");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !currentPassword || !newPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (!isPasswordChangeValid) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Note: Changing password directly might require re-authentication depending on recent activity.
      // For a robust solution, you might need to re-authenticate the user first.
      await updatePassword(user, newPassword);
      // Optionally show a success message
      console.log("Password changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error("Error changing password:", err);
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.signOut();
      router.replace('/signin'); // Navigate back to sign-in screen
    } catch (err: any) {
      console.error("Error logging out:", err);
      setError("Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Profile</Text>

      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {user ? (
        <View style={styles.profileInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>

          <Text style={styles.label}>Display Name:</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
          />

          <Text style={styles.label}>Bio:</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Enter bio"
            multiline
          />

          <Button title="Save Profile" onPress={handleUpdateProfile} disabled={loading} />

          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password (min 6 characters)"
            secureTextEntry
          />
          <Button title="Change Password" onPress={handleChangePassword} disabled={loading || !isPasswordChangeValid} />
        </View>
      ) : (
        <Text>Please log in to view your profile.</Text>
      )}

    {/* Logout Button outside inner View */}
    <View style={styles.logoutButtonContainer}>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileInfo: {
    width: '90%',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  logoutButtonContainer: {
    marginTop: 20,
  },
});
