import { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';

// Assuming StyledTextInput is a custom component
import { signUp } from '@/utils/firebaseAuth';
export default function SignUpScreen() { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // Not needed with Link component

  const handleSignUp = async () => {
    setError(null); // Clear previous errors
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
 } catch (error) {
      // Handle specific Firebase auth errors more gracefully if needed
      console.error("Sign up failed:", error);
      setError((error as Error).message);
 }
  };

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold mb-4">Sign Up</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-md p-2 mb-4"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="w-full border border-gray-300 rounded-md p-2 mb-4"
        placeholder="Enter your password (min 6 characters)"      
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Sign Up" onPress={handleSignUp} disabled={loading}/>

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <Link href="/(auth)/signin" className="mt-4 text-blue-500">
        Already have an account? Sign In
      </Link>

      {loading && <ActivityIndicator size="small" color="#0000ff" style={{ marginTop: 10 }} />}
    </View>
  );
}