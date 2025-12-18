import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type DocumentsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface Document {
  id: number;
  type: string;
  title: string;
  date: string;
  appointmentDate: string;
  amount: string | null;
  status: string;
  fileUrl: string;
}

const documents: Document[] = [
  {
    id: 1,
    type: 'Appointment Confirmation',
    title: 'Appointment #Apt0001 - Dr. Ruby Perrin',
    date: '15 Nov 2024',
    appointmentDate: '20 Nov 2024',
    amount: '$150.00',
    status: 'Confirmed',
    fileUrl: '/documents/appointment-apt0001.pdf',
  },
  {
    id: 2,
    type: 'Payment Receipt',
    title: 'Payment Receipt - Appointment #Apt0001',
    date: '15 Nov 2024',
    appointmentDate: '20 Nov 2024',
    amount: '$150.00',
    status: 'Paid',
    fileUrl: '/documents/receipt-apt0001.pdf',
  },
  {
    id: 3,
    type: 'Medical Report',
    title: 'Lab Report - Blood Test',
    date: '05 Nov 2024',
    appointmentDate: '05 Nov 2024',
    amount: null,
    status: 'Available',
    fileUrl: '/documents/lab-report-001.pdf',
  },
  {
    id: 4,
    type: 'Invoice',
    title: 'Invoice #INV-0010',
    date: '01 Nov 2024',
    appointmentDate: '01 Nov 2024',
    amount: '$300.00',
    status: 'Paid',
    fileUrl: '/documents/invoice-0010.pdf',
  },
];

export const DocumentsScreen = () => {
  const navigation = useNavigation<DocumentsScreenNavigationProp>();
  const [filter, setFilter] = useState<'all' | 'appointment' | 'receipt' | 'report' | 'invoice'>('all');

  const getStatusColor = (status: string) => {
    const colorsMap: { [key: string]: string } = {
      Confirmed: colors.success,
      Paid: colors.success,
      Completed: colors.info,
      Available: colors.primary,
      Pending: colors.warning,
      Cancelled: colors.error,
    };
    return colorsMap[status] || colors.textSecondary;
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('Appointment')) return 'calendar';
    if (type.includes('Receipt') || type.includes('Invoice')) return 'receipt';
    if (type.includes('Report')) return 'document-text';
    return 'document';
  };

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter((doc) => doc.type.toLowerCase().includes(filter));

  const handleDownload = (fileUrl: string) => {
    // Handle document download
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {['all', 'appointment', 'receipt', 'report', 'invoice'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterTab,
                filter === filterOption && styles.filterTabActive,
              ]}
              onPress={() => setFilter(filterOption as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === filterOption && styles.filterTabTextActive,
                ]}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Documents List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.documentsList}>
        {filteredDocuments.map((document) => (
          <View key={document.id} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <Ionicons
                  name={getDocumentIcon(document.type) as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentType}>{document.type}</Text>
                <Text style={styles.documentTitle}>{document.title}</Text>
                <View style={styles.documentMeta}>
                  <Text style={styles.documentDate}>{document.date}</Text>
                  {document.amount && (
                    <Text style={styles.documentAmount}>{document.amount}</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.documentFooter}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(document.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(document.status) }]}>
                  {document.status}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownload(document.fileUrl)}
              >
                <Ionicons name="download-outline" size={20} color={colors.primary} />
                <Text style={styles.downloadText}>Download</Text>
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
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.textWhite,
  },
  documentsList: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  documentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  documentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  downloadText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
});

