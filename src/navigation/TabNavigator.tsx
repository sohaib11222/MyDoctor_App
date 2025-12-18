import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { TabParamList } from './types';
import { HomeStack } from './stacks/HomeStack';
import { AppointmentsStack } from './stacks/AppointmentsStack';
import { ChatStack } from './stacks/ChatStack';
import { PharmacyStack } from './stacks/PharmacyStack';
import { PharmacyDashboardStack } from './stacks/PharmacyDashboardStack';
import { ProductsStack } from './stacks/ProductsStack';
import { OrdersStack } from './stacks/OrdersStack';
import { MoreStack } from './stacks/MoreStack';
import { colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => {
  const { user } = useAuth();

  // Determine which tabs to show based on user role
  const getTabs = () => {
    // Pharmacy has different tab structure
    if (user?.role === 'pharmacy') {
      return [
        { name: 'Dashboard', component: PharmacyDashboardStack },
        { name: 'Products', component: ProductsStack },
        { name: 'Orders', component: OrdersStack },
        { name: 'More', component: MoreStack },
      ];
    }

    // Patient and Doctor tabs
    const baseTabs = [
      { name: 'Home', component: HomeStack },
      { name: 'Appointments', component: AppointmentsStack },
      { name: 'Chat', component: ChatStack },
    ];

    // Add Pharmacy tab only for patients
    if (user?.role === 'patient') {
      baseTabs.push({ name: 'Pharmacy', component: PharmacyStack });
    }

    // Always add More tab at the end
    baseTabs.push({ name: 'More', component: MoreStack });

    return baseTabs;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home' || route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'Appointments') {
            iconName = 'calendar';
          } else if (route.name === 'Chat') {
            iconName = 'message-circle';
          } else if (route.name === 'Pharmacy') {
            iconName = 'shopping-bag';
          } else if (route.name === 'Products') {
            iconName = 'package';
          } else if (route.name === 'Orders') {
            iconName = 'file-text';
          } else {
            iconName = 'more-horizontal';
          }

          return <Feather name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: -15,
          height: 70,
          borderTopWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
        },
      })}
    >
      {getTabs().map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name as keyof TabParamList}
          component={tab.component}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? tab.name;
            // Hide tab bar when ChatDetail screen is focused
            if (tab.name === 'Chat' && routeName === 'ChatDetail') {
              return {
                tabBarStyle: { display: 'none' },
              };
            }
            return {};
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

