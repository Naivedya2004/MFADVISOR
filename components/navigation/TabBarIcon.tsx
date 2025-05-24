import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabBarIconProps = {
  name: IoniconName; // ✅ Type-safe for Ionicons only
  color: string;
  focused: boolean;
};

export default function TabBarIcon({ name, color, focused }: TabBarIconProps) {
  return (
    <Ionicons
      name={name}
      size={26}
      color={color}
      style={{
        opacity: focused ? 1 : 0.6,
        transform: [{ scale: focused ? 1.1 : 1 }],
      }}
    />
  );
}
