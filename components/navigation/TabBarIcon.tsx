import React from 'react';
import { Text } from 'react-native';

interface TabBarIconProps {
  name: string;
  color: string;
  focused: boolean;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, color, focused }) => {
  // You can replace this Text component with an actual icon component
  // from a library like @expo/vector-icons, react-native-vector-icons, etc.
  return (
    <Text style={{ color: color, fontWeight: focused ? 'bold' : 'normal' }}>
      {name}
    </Text>
  );
};

export default TabBarIcon;