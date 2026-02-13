import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

const LANGUAGES: Array<{ code: string; labelKey: string }> = [
  { code: 'en', labelKey: 'languageScreen.english' },
  { code: 'it', labelKey: 'languageScreen.italian' },
];

export const LanguageScreen = () => {
  const { language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((item) => {
          const isSelected = item.code === language;
          return (
            <TouchableOpacity
              key={item.code}
              style={styles.row}
              onPress={async () => {
                await setLanguage(item.code);
                queryClient.invalidateQueries();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.label}>{t(item.labelKey)}</Text>
                <Text style={styles.code}>{item.code}</Text>
              </View>
              <View style={styles.rowRight}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={colors.border} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    paddingVertical: 12,
  },
  row: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLeft: {
    flex: 1,
  },
  rowRight: {
    marginLeft: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  code: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
