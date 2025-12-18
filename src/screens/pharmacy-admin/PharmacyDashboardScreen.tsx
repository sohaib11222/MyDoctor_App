import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyDashboardStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PharmacyDashboardScreenNavigationProp = NativeStackNavigationProp<PharmacyDashboardStackParamList>;

interface StatCard {
  id: string;
  title: string;
  value: string;
  icon: string;
  iconColor: string;
  progress: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  telephone: string;
  email: string;
  dateAdded: string;
}

const stats: StatCard[] = [
  {
    id: '1',
    title: 'Sales Today',
    value: '$50.00',
    icon: 'cash',
    iconColor: colors.primary,
    progress: 50,
  },
  {
    id: '2',
    title: 'Expense Today',
    value: '$5.22',
    icon: 'card',
    iconColor: colors.success,
    progress: 50,
  },
  {
    id: '3',
    title: 'Medicine',
    value: '485',
    icon: 'medical',
    iconColor: colors.error,
    progress: 50,
  },
  {
    id: '4',
    title: 'Staff',
    value: '50',
    icon: 'people',
    iconColor: colors.warning,
    progress: 50,
  },
];

const customers: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    address: '123 Main St, New York',
    telephone: '+1 234-567-8900',
    email: 'john.doe@example.com',
    dateAdded: '15 Nov 2024',
  },
  {
    id: '2',
    name: 'Jane Smith',
    address: '456 Oak Ave, Los Angeles',
    telephone: '+1 234-567-8901',
    email: 'jane.smith@example.com',
    dateAdded: '14 Nov 2024',
  },
  {
    id: '3',
    name: 'Robert Johnson',
    address: '789 Pine Rd, Chicago',
    telephone: '+1 234-567-8902',
    email: 'robert.j@example.com',
    dateAdded: '13 Nov 2024',
  },
  {
    id: '4',
    name: 'Emily Davis',
    address: '321 Elm St, Houston',
    telephone: '+1 234-567-8903',
    email: 'emily.d@example.com',
    dateAdded: '12 Nov 2024',
  },
  {
    id: '5',
    name: 'Michael Brown',
    address: '654 Maple Dr, Phoenix',
    telephone: '+1 234-567-8904',
    email: 'michael.b@example.com',
    dateAdded: '11 Nov 2024',
  },
];

export const PharmacyDashboardScreen = () => {
  const navigation = useNavigation<PharmacyDashboardScreenNavigationProp>();

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${item.iconColor}20` }]}>
          <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        </View>
        <Text style={styles.statValue}>{item.value}</Text>
      </View>
      <View style={styles.statFooter}>
        <Text style={styles.statTitle}>{item.title}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.iconColor }]} />
        </View>
      </View>
    </View>
  );

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={styles.customerRow} activeOpacity={0.7}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerDetail}>{item.address}</Text>
        <Text style={styles.customerDetail}>{item.telephone}</Text>
        <Text style={styles.customerDetail}>{item.email}</Text>
      </View>
      <Text style={styles.customerDate}>{item.dateAdded}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>Welcome Admin!</Text>
          <Text style={styles.breadcrumb}>Dashboard</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <FlatList
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.statsList}
          />
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Revenue</Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart" size={48} color={colors.textLight} />
              <Text style={styles.chartPlaceholderText}>Revenue Chart</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Status</Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="trending-up" size={48} color={colors.textLight} />
              <Text style={styles.chartPlaceholderText}>Status Chart</Text>
            </View>
          </View>
        </View>

        {/* Latest Customers */}
        <View style={styles.customersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Customers</Text>
            <TouchableOpacity
              onPress={() => {
                (navigation as any).navigate('Orders', { screen: 'OrdersList' });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.customersCard}>
            <View style={styles.customersHeader}>
              <Text style={styles.tableHeader}>Name</Text>
              <Text style={styles.tableHeader}>Address</Text>
              <Text style={styles.tableHeader}>Telephone</Text>
              <Text style={styles.tableHeader}>Email</Text>
              <Text style={styles.tableHeader}>Date added</Text>
            </View>
            <FlatList
              data={customers}
              renderItem={renderCustomer}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    padding: 16,
    paddingTop:40,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  breadcrumb: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    padding: 16,
  },
  statsList: {
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statFooter: {
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartsSection: {
    padding: 16,
    gap: 16,
  },
  chartCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  customersSection: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  customersCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customersHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  tableHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  customerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  customerDate: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});

