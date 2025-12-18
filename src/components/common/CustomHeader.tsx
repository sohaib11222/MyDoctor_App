import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface CustomHeaderProps {
  title: string;
  showBack?: boolean;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  avatar?: any;
  backgroundColor?: string;
  headerStyle?: any;
  noBorderRadius?: boolean;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBack = true,
  rightComponent,
  leftComponent,
  avatar,
  backgroundColor = colors.primary,
  headerStyle,
  noBorderRadius = false,
}) => {
  const navigation = useNavigation();

  const safeAreaStyle = [
    styles.safeArea,
    { backgroundColor },
    noBorderRadius && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    headerStyle,
  ];

  const headerViewStyle = [
    styles.header,
    { backgroundColor },
    noBorderRadius && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    headerStyle,
  ];

  return (
    <SafeAreaView style={safeAreaStyle}>
      <View style={headerViewStyle}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textWhite} />
            </TouchableOpacity>
          )}
          {leftComponent && (
            <View style={styles.leftComponentContainer}>
              {leftComponent}
            </View>
          )}
          {!leftComponent && avatar && (
            <View style={styles.avatarContainer}>
              <Image source={avatar} style={styles.avatar} />
              <Text style={styles.titleWithAvatar} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}
        </View>
        {!leftComponent && !avatar && (
          <View style={styles.centerSection}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
        <View style={styles.rightSection}>
          {rightComponent || <View style={styles.placeholder} />}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1000,
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,   // paddingVertical: 12,
    paddingTop:40,
    paddingBottom:20,
    minHeight: 56,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  leftSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  leftComponentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
  },
  titleWithAvatar: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    flex: 1,
  },
  rightSection: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  placeholder: {
    width: 32,
    height: 32,
  },
});

