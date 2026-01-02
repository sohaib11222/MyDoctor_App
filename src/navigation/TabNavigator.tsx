import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute, NavigationContainerRef } from '@react-navigation/native';
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

    // Add Products tab for doctors
    if (user?.role === 'doctor') {
      baseTabs.push({ name: 'Products', component: ProductsStack });
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
            
            // List of screens where tab bar should be hidden
            const screensToHideTabBar = [
              // Chat screens
              'ChatDetail',
              'AdminChat',
              // Appointment screens
              'AppointmentDetails',
              'AvailableTimings',
              'AppointmentRequests',
              // Product screens
              'AddProduct',
              'EditProduct',
              // More/Profile screens
              'DoctorDashboard',
              'MyPatients',
              'Reviews',
              'Invoices',
              'Subscription',
              'Announcements',
              'PharmacyManagement',
              'Profile',
              'ProfileSettings',
              'ChangePassword',
            ];
            
            // Hide tab bar for specific screens
            if (screensToHideTabBar.includes(routeName)) {
              return {
                tabBarStyle: { display: 'none' },
              };
            }
            
            return {};
          }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => {
              // Get the current navigation state
              const state = navigation.getState();
              const currentRoute = state.routes[state.index];
              const routeName = getFocusedRouteNameFromRoute(route) ?? tab.name;
              
              // Define root screens for each tab
              const rootScreens: Record<string, string> = {
                'Home': 'HomeScreen',
                'Appointments': 'AppointmentsScreen',
                'Chat': 'ChatList',
                'Products': 'ProductList',
                'More': 'MoreScreen',
                'Pharmacy': 'PharmacyHome',
                'Dashboard': 'PharmacyDashboard',
                'Orders': 'OrdersList',
              };
              
              const rootScreen = rootScreens[tab.name];
              
              // Check if we're switching tabs or if we're on a nested screen within the same tab
              const isSwitchingTabs = currentRoute.name !== tab.name;
              const isOnNestedScreen = routeName !== tab.name && routeName !== rootScreen;
              
              // Always reset to root screen when clicking a tab (unless already on root)
              if (isSwitchingTabs || isOnNestedScreen) {
                // Reset to root screen of the target tab
                e.preventDefault();
                
                // Get the target tab's route state
                const targetRoute = state.routes.find((r) => r.name === tab.name);
                
                // If target route exists and has nested screens, reset to root
                if (targetRoute && targetRoute.state && targetRoute.state.index > 0) {
                  // Pop all screens in the stack to get back to root
                  const targetState = targetRoute.state;
                  const targetNavigator = navigation.getParent();
                  
                  // Navigate to the tab with root screen explicitly
                  (navigation as any).navigate({
                    name: tab.name,
                    params: {
                      screen: rootScreen,
                    },
                    merge: false, // Don't merge, replace the state
                  });
                } else {
                  // Simple navigation to tab root
                  navigation.navigate(tab.name as never);
                }
              }
            },
          })}
        />
      ))}
    </Tab.Navigator>
  );
};

