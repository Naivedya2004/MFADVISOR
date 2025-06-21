import { signIn } from '@/utils/firebaseAuth';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';

export default function SignInScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null); // Clear any previous errors
    setLoading(true); // Set loading to true

    try {
      await signIn(email, password);
      // Optionally navigate to app screens on successful sign-in
      router.replace('/(app)/(tabs)');
    } catch (error: any) { // Keep any for now to avoid strict type issues with unknown error types
      // Check if error is an object and has a message property
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as any).message); // Safely access message
      } else {
        setError('An unknown error occurred.'); // Generic error message
      }
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-4">Sign In</Text>
      <TextInput
        className="w-3/4 p-3 border border-gray-300 rounded mb-4"
        placeholder="Enter your email"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="w-3/4 p-3 border border-gray-300 rounded mb-4"
        placeholder="Enter your password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry

      />
      <Button title="Sign In" onPress={handleSignIn} disabled={loading} /> {/* Disable button when loading */}

      {error && (
        <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>
      )}

      {loading && ( // Show ActivityIndicator when loading
        <ActivityIndicator size="small" color="#0000ff" style={{ marginTop: 10 }} />
      )}

      <Link href="/(auth)/signup" className="mt-4 text-blue-600">
        Don't have an account? Sign Up
      </Link>
    </View>
  );
}