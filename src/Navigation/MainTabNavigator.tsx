
/**
 * KnoriX — Main Tab Navigator
 * src/Navigation/MainTabNavigator.tsx
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';

// ─── Screens ─────────────────────────────────────────────────────────────────
import RenderScreen from '../screens/AIDN/RenderScreen';

// ─── Placeholder screens (build these later) ─────────────────────────────────
function HomeScreen() {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>🏠 Home</Text>
      <Text style={placeholderStyles.sub}>Student Dashboard — Coming Soon</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>👤 Profile</Text>
      <Text style={placeholderStyles.sub}>Knowledge Graph — Coming Soon</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 32,
    color: '#E8E8F0',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#6B6B8A',
    fontFamily: 'System',
  },
});

// ─── Tab icon ─────────────────────────────────────────────────────────────────
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home:   '🏠',
    Learn:  '⚡',
    Profile:'👤',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
        {icons[label] ?? '●'}
      </Text>
    </View>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#12121A',
            borderTopColor: '#1E1E2E',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#7C6FFF',
          tabBarInactiveTintColor: '#4A4A6A',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Learn"
          component={RenderScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Learn" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
