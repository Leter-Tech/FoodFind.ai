import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import ForagedFoodScreen from './screens/ForagedFoodScreen';
import FoodBankScreen from './screens/FoodBankScreen';
import DonorScreen from './screens/DonorScreen';
import RecipientScreen from './screens/RecipientScreen';
import VolunteerDeliveryScreen from './screens/VolunteerDeliveryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Foraged') {
                iconName = 'leaf';
              } else if (route.name === 'Donate') {
                iconName = 'hand-heart';
              } else if (route.name === 'Find') {
                iconName = 'food';
              } else if (route.name === 'FoodBank') {
                iconName = 'warehouse';
              } else if (route.name === 'Volunteer') {
                iconName = 'truck-delivery';
              }
              return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
            },
            tabBarStyle: styles.bottomTabBar,
            tabBarActiveTintColor: '#2E7D32',
            tabBarInactiveTintColor: '#757575',
          })}>
          <Tab.Screen name="Foraged" component={ForagedFoodScreen} options={{ title: 'Foraged Food', headerShown: false }} />
          <Tab.Screen name="Donate" component={DonorScreen} options={{ title: 'Donate Food', headerShown: false }} />
          <Tab.Screen name="Find" component={RecipientScreen} options={{ title: 'Find Food', headerShown: false }} />
          <Tab.Screen name="Volunteer" component={VolunteerDeliveryScreen} options={{ title: 'Volunteer', headerShown: false }} />
          <Tab.Screen name="FoodBank" component={FoodBankScreen} options={{ title: 'Food Banks', headerShown: false }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bottomTabBar: {
    elevation: 3,
    backgroundColor: '#FFFFFF',
    height: 60,
    paddingBottom: 5,
  },
});
