import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { getFocusedRouteNameFromRoute, NavigationContainerRef, CommonActions, StackActions } from '@react-navigation/native';

import { Feather } from '@expo/vector-icons';

import { TabParamList } from './types';

import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

  const getTabLabel = (name: string) => {
    switch (name) {
      case 'Home':
        return t('tabs.home');
      case 'Appointments':
        return t('tabs.appointments');
      case 'Chat':
        return t('tabs.chat');
      case 'Pharmacy':
        return t('tabs.pharmacy');
      case 'More':
        return t('tabs.more');
      case 'Dashboard':
        return t('tabs.dashboard');
      case 'Products':
        return t('tabs.products');
      case 'Orders':
        return t('tabs.orders');
      default:
        return name;
    }
  };



  // Determine which tabs to show based on user role

  const getTabs = () => {

    // Pharmacy has different tab structure

    if (user?.role === 'pharmacy' || user?.role === 'parapharmacy') {

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

        tabBarLabel: getTabLabel(route.name),

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

              // Always prevent default to handle navigation manually

              e.preventDefault();

              const nav = navigation as any;
              if (!nav) return;

              

              // Get the current navigation state

              const state = nav.getState();

              

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

              

              // Find the target tab's route

              const targetRoute = state.routes.find((r: any) => r.name === tab.name);

              const targetTabIndex = state.routes.findIndex((r: any) => r.name === tab.name);

              

              // Always reset the target tab's stack to root screen

              if (targetRoute) {

                // Reset the target tab's stack to root screen

                nav.dispatch(

                  CommonActions.reset({

                    index: targetTabIndex,

                    routes: state.routes.map((r: any) => {

                      if (r.name === tab.name) {

                        // Always reset this tab's stack to root screen

                        return {

                          ...r,

                          state: {

                            routes: [{ name: rootScreen }],

                            index: 0,

                          },

                        };

                      }

                      // Keep other tabs as they are

                      return r;

                    }),

                  } as any)

                );

              } else {

                // Tab doesn't exist in state, navigate to it

                nav.navigate(tab.name);

              }

            },

          })}

        />

      ))}

    </Tab.Navigator>

  );

};



