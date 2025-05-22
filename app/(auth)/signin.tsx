import { Text, View, TextInput, Button, Alert } from 'react-native';
import React, { useState } from 'react';
import { signIn } from '@/utils/firebaseAuth';
import { Link, useRouter } from 'expo-router';

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      // Optionally navigate to app screens on successful sign-in
      router.replace('/(app)/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-4">Sign In</Text>
      <TextInput
        className="w-3/4 p-3 border border-gray-300 rounded mb-4"
        placeholder="Email"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="w-3/4 p-3 border border-gray-300 rounded mb-4"
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />
      <Button title="Sign In" onPress={handleSignIn} />
      <Link href="/(auth)/signup" className="mt-4 text-blue-600">
        Don't have an account? Sign Up
      </Link>
    </View>
  );
}