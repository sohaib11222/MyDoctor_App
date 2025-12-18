import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList, AppointmentsStackParamList, HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type DoctorDashboardScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface StatCard {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

interface Appointment {
  id: string;
  appointmentId: string;
  patientName: string;
  patientAvatar: any;
  date: string;
  type: string;
}

interface Invoice {
  id: string;
  patientName: string;
  patientAvatar: any;
  appointmentId: string;
  amount: string;
  paidOn: string;
}

interface Notification {
  id: string;
  icon: string;
  iconColor: string;
  message: string;
  time: string;
}

const stats: StatCard[] = [
  {
    id: '1',
    title: 'Total Patient',
    value: '978',
    change: '15% From Last Week',
    changeType: 'positive',
    icon: 'people',
  },
  {
    id: '2',
    title: 'Patients Today',
    value: '80',
    change: '15% From Yesterday',
    changeType: 'negative',
    icon: 'person-add',
  },
  {
    id: '3',
    title: 'Appointments Today',
    value: '50',
    change: '20% From Yesterday',
    changeType: 'positive',
    icon: 'calendar',
  },
];

const appointments: Appointment[] = [
  {
    id: '1',
    appointmentId: '#Apt0001',
    patientName: 'Adrian Marshall',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '11 Nov 2024 10.45 AM',
    type: 'General',
  },
  {
    id: '2',
    appointmentId: '#Apt0002',
    patientName: 'Kelly Stevens',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '10 Nov 2024 11.00 AM',
    type: 'Clinic Consulting',
  },
  {
    id: '3',
    appointmentId: '#Apt0003',
    patientName: 'Samuel Anderson',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '03 Nov 2024 02.00 PM',
    type: 'General',
  },
];

const invoices: Invoice[] = [
  {
    id: '1',
    patientName: 'Adrian',
    patientAvatar: require('../../../assets/avatar.png'),
    appointmentId: '#Apt0001',
    amount: '$450',
    paidOn: '11 Nov 2024',
  },
  {
    id: '2',
    patientName: 'Kelly',
    patientAvatar: require('../../../assets/avatar.png'),
    appointmentId: '#Apt0002',
    amount: '$500',
    paidOn: '10 Nov 2024',
  },
  {
    id: '3',
    patientName: 'Samuel',
    patientAvatar: require('../../../assets/avatar.png'),
    appointmentId: '#Apt0003',
    amount: '$320',
    paidOn: '03 Nov 2024',
  },
];

const notifications: Notification[] = [
  {
    id: '1',
    icon: 'notifications',
    iconColor: colors.primary,
    message: 'Booking Confirmed on 21 Mar 2024 10:30 AM',
    time: 'Just Now',
  },
  {
    id: '2',
    icon: 'star',
    iconColor: colors.warning,
    message: 'You have a New Review for your Appointment',
    time: '5 Days ago',
  },
  {
    id: '3',
    icon: 'calendar',
    iconColor: colors.error,
    message: 'You have Appointment with Ahmed by 01:20 PM',
    time: '12:55 PM',
  },
];

export const DoctorDashboardScreen = () => {
  const navigation = useNavigation<DoctorDashboardScreenNavigationProp>();

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{item.title}</Text>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={[styles.statChange, item.changeType === 'positive' ? styles.positiveChange : styles.negativeChange]}>
          {item.change}
        </Text>
      </View>
      <View style={styles.statIcon}>
        <Ionicons name={item.icon as any} size={32} color={colors.primary} />
      </View>
    </View>
  );

  const renderAppointment = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      style={styles.appointmentItem}
      onPress={() => {
        (navigation as any).navigate('Appointments', {
          screen: 'AppointmentDetails',
          params: { appointmentId: item.id },
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.patientInfo}>
        <Image source={item.patientAvatar} style={styles.patientAvatar} />
        <View style={styles.patientDetails}>
          <Text style={styles.appointmentId}>{item.appointmentId}</Text>
          <Text style={styles.patientName}>{item.patientName}</Text>
        </View>
      </View>
      <View style={styles.appointmentMeta}>
        <Text style={styles.appointmentDate}>{item.date}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.appointmentActions}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="checkmark" size={20} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity style={styles.invoiceItem} activeOpacity={0.7}>
      <View style={styles.patientInfo}>
        <Image source={item.patientAvatar} style={styles.patientAvatar} />
        <View style={styles.patientDetails}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.appointmentId}>{item.appointmentId}</Text>
        </View>
      </View>
      <View style={styles.invoiceMeta}>
        <View style={styles.invoiceAmount}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{item.amount}</Text>
        </View>
        <View style={styles.invoiceDate}>
          <Text style={styles.dateLabel}>Paid On</Text>
          <Text style={styles.dateValue}>{item.paidOn}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewButton} activeOpacity={0.7}>
        <Ionicons name="eye" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={styles.notificationItem} activeOpacity={0.7}>
      <View style={[styles.notificationIcon, { backgroundColor: `${item.iconColor}20` }]}>
        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <FlatList
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsList}
          />
        </View>

        {/* Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appointments</Text>
            <TouchableOpacity
              onPress={() => {
                (navigation as any).navigate('Appointments', { screen: 'Appointments' });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={appointments}
            renderItem={renderAppointment}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Invoices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Invoices')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={invoices}
            renderItem={renderInvoice}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
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
  statsContainer: {
    marginTop: 16,
  },
  statsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: 160,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statChange: {
    fontSize: 11,
  },
  positiveChange: {
    color: colors.success,
  },
  negativeChange: {
    color: colors.error,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.background,
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appointmentMeta: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  appointmentDate: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  invoiceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 16,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceDate: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 12,
    color: colors.text,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

