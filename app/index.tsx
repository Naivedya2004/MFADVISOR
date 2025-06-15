import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the portfolio tab by default
  return <Redirect href="/(tabs)/portfolio" />;
}
