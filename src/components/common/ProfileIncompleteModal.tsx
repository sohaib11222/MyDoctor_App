import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface ProfileIncompleteModalProps {
  show: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
}

export const ProfileIncompleteModal: React.FC<ProfileIncompleteModalProps> = ({
  show,
  onClose,
  onGoToProfile,
}) => {
  if (!show) return null;

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <Text style={styles.modalTitle}>Profile Incomplete</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle-outline" size={64} color={colors.warning} />
            </View>

            <Text style={styles.heading}>Your doctor profile is not complete</Text>
            <Text style={styles.description}>
              To start accepting appointments, please complete your profile by filling in the following required information:
            </Text>

            <View style={styles.listContainer}>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.listText}>
                  <Text style={styles.boldText}>Title/Designation</Text> (e.g., MD, MBBS)
                </Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.listText}>
                  <Text style={styles.boldText}>Biography</Text> (Professional background and expertise)
                </Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.listText}>
                  <Text style={styles.boldText}>Specialization</Text>
                </Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.listText}>
                  <Text style={styles.boldText}>At least one Clinic</Text> (Location and address)
                </Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.listText}>
                  <Text style={styles.boldText}>At least one Service</Text>
                </Text>
              </View>
            </View>

            <View style={styles.noteContainer}>
              <Ionicons name="information-circle" size={20} color={colors.warning} />
              <Text style={styles.noteText}>
                <Text style={styles.boldText}>Note:</Text> You cannot accept appointments until your profile is complete.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onGoToProfile}
            >
              <Ionicons name="create-outline" size={20} color={colors.textWhite} />
              <Text style={styles.primaryButtonText}>Complete Profile Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
