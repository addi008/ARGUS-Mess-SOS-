/**
 * src/navigation/AppNavigator.js
 * Bottom-tab navigation shell for the MeshSOS mobile app.
 * Screens will be filled with real content in Phase 2+.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen     from '../screens/HomeScreen';
import SOSScreen      from '../screens/SOSScreen';
import MapScreen      from '../screens/MapScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Tab = createBottomTabNavigator();

// Simple emoji icon component
function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:       { backgroundColor: '#111827' },
        headerTintColor:   '#f9fafb',
        headerTitleStyle:  { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor:  '#1f2937',
        },
        tabBarActiveTintColor:   '#ef4444',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'MeshSOS',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          title: 'Send SOS',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🆘" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Local Map',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
