import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type InvoicesScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface Invoice {
  id: string;
  name: string;
  img: any;
  apptDate: string;
  bookedOn: string;
  amount: string;
}

// Patient invoices (showing doctors)
const patientInvoices: Invoice[] = [
  {
    id: '#INV1236',
    name: 'Edalin Hendry',
    img: require('../../../assets/avatar.png'),
    apptDate: '24 Mar 2024',
    bookedOn: '21 Mar 2024',
    amount: '$300',
  },
  {
    id: '#NV3656',
    name: 'John Homes',
    img: require('../../../assets/avatar.png'),
    apptDate: '17 Mar 2024',
    bookedOn: '14 Mar 2024',
    amount: '$450',
  },
  {
    id: '#INV1246',
    name: 'Shanta Neill',
    img: require('../../../assets/avatar.png'),
    apptDate: '11 Mar 2024',
    bookedOn: '07 Mar 2024',
    amount: '$250',
  },
  {
    id: '#INV6985',
    name: 'Anthony Tran',
    img: require('../../../assets/avatar.png'),
    apptDate: '26 Feb 2024',
    bookedOn: '23 Feb 2024',
    amount: '$320',
  },
  {
    id: '#INV3659',
    name: 'Susan Lingo',
    img: require('../../../assets/avatar.png'),
    apptDate: '18 Feb 2024',
    bookedOn: '15 Feb 2024',
    amount: '$480',
  },
];

// Doctor invoices (showing patients)
const doctorInvoices: Invoice[] = [
  {
    id: '#Inv-2021',
    name: 'Edalin Hendry',
    img: require('../../../assets/avatar.png'),
    apptDate: '24 Mar 2024',
    bookedOn: '21 Mar 2024',
    amount: '$300',
  },
  {
    id: '#Inv-2022',
    name: 'John Homes',
    img: require('../../../assets/avatar.png'),
    apptDate: '17 Mar 2024',
    bookedOn: '14 Mar 2024',
    amount: '$450',
  },
  {
    id: '#Inv-2023',
    name: 'Shanta Neill',
    img: require('../../../assets/avatar.png'),
    apptDate: '11 Mar 2024',
    bookedOn: '07 Mar 2024',
    amount: '$250',
  },
  {
    id: '#Inv-2024',
    name: 'Anthony Tran',
    img: require('../../../assets/avatar.png'),
    apptDate: '26 Feb 2024',
    bookedOn: '23 Feb 2024',
    amount: '$320',
  },
  {
    id: '#Inv-2025',
    name: 'Susan Lingo',
    img: require('../../../assets/avatar.png'),
    apptDate: '18 Feb 2024',
    bookedOn: '15 Feb 2024',
    amount: '$480',
  },
];

export const InvoicesScreen = () => {
  const navigation = useNavigation<InvoicesScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const invoices = isDoctor ? doctorInvoices : patientInvoices;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewInvoice = (invoiceId: string) => {
    // Navigate to invoice view
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    // Handle download
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoices..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Invoices List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredInvoices.map((invoice) => (
          <View key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.doctorInfo}>
                <Image source={invoice.img} style={styles.doctorImage} />
                <View style={styles.doctorDetails}>
                  <Text style={styles.invoiceId}>{invoice.id}</Text>
                  <Text style={styles.doctorName}>{invoice.name}</Text>
                </View>
              </View>
              <Text style={styles.amount}>{invoice.amount}</Text>
            </View>
            <View style={styles.invoiceDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Appointment Date:</Text>
                <Text style={styles.detailValue}>{invoice.apptDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booked on:</Text>
                <Text style={styles.detailValue}>{invoice.bookedOn}</Text>
              </View>
            </View>
            <View style={styles.invoiceActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewInvoice(invoice.id)}
              >
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownloadInvoice(invoice.id)}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  invoiceCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  invoiceDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
});

