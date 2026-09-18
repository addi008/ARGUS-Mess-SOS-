/**
 * App.js — MeshSOS Mobile App Root
 * Entry point for the Expo app.
 * Sets up React Navigation and renders the bottom-tab navigator.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0a0f1e" />
      <AppNavigator />
    </NavigationContainer>
  );
}
