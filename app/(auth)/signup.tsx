import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { Link, useRouter } from 'expo-router';

// Assuming StyledTextInput is a custom component
import { signUp } from '@/utils/firebaseAuth';

// const StyledView = styled(View);
export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const router = useRouter(); // Not needed with Link component

  const handleSignUp = async () => {
 try {
 await signUp(email, password);
 } catch (error) {
 console.error("Sign up failed:", error);
 }
  };

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold mb-4">Sign Up</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-md p-2 mb-4"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <StyledTextInput
        className="w-full border border-gray-300 rounded-md p-2 mb-4"
        placeholder="Password"      
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Sign Up" onPress={handleSignUp} />

      <Link href="/(auth)/signin" className="mt-4 text-blue-500">
        Already have an account? Sign In
      </Link>
    </View>
  );
}