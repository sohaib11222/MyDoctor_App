import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';

interface AddTimingsModalProps {
  show: boolean;
  onClose: () => void;
  onGoToTimings: () => void;
}

export const AddTimingsModal: React.FC<AddTimingsModalProps> = ({
  show,
  onClose,
  onGoToTimings,
}) => {
  if (!show) return null;

  const { t } = useTranslation();

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
              <Ionicons name="time-outline" size={24} color={colors.warning} />
              <Text style={styles.modalTitle}>{t('doctor.addTimingsModal.title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.warning} />
            </View>

            <Text style={styles.heading}>{t('doctor.addTimingsModal.heading')}</Text>
            <Text style={styles.description}>
              {t('doctor.addTimingsModal.description')}
            </Text>

            <View style={styles.noteContainer}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={styles.noteText}>
                <Text style={styles.boldText}>{t('doctor.addTimingsModal.noteLabel')}</Text> {t('doctor.addTimingsModal.noteText')}
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>{t('doctor.addTimingsModal.actions.doItLater')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onGoToTimings}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textWhite} />
              <Text style={styles.primaryButtonText}>{t('doctor.addTimingsModal.actions.addNow')}</Text>
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
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
  boldText: {
    fontWeight: '600',
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
