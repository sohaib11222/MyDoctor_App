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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type DependentsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface Dependent {
  id: number;
  name: string;
  relation: string;
  gender: string;
  age: string;
  bloodGroup: string;
  img: any;
  checked: boolean;
}

const dependents: Dependent[] = [
  {
    id: 1,
    name: 'Laura',
    relation: 'Mother',
    gender: 'Female',
    age: '58 years 20 days',
    bloodGroup: 'AB+ve',
    img: require('../../../assets/avatar.png'),
    checked: true,
  },
  {
    id: 2,
    name: 'Mathew',
    relation: 'Father',
    gender: 'Male',
    age: '59 years 15 days',
    bloodGroup: 'AB+ve',
    img: require('../../../assets/avatar.png'),
    checked: true,
  },
  {
    id: 3,
    name: 'Christopher',
    relation: 'Brother',
    gender: 'Male',
    age: '32 years 6 Months',
    bloodGroup: 'A+ve',
    img: require('../../../assets/avatar.png'),
    checked: true,
  },
  {
    id: 4,
    name: 'Elisa',
    relation: 'Sister',
    gender: 'Female',
    age: '28 years 4 Months',
    bloodGroup: 'B+ve',
    img: require('../../../assets/avatar.png'),
    checked: false,
  },
];

export const DependentsScreen = () => {
  const navigation = useNavigation<DependentsScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [dependentsList, setDependentsList] = useState(dependents);

  const filteredDependents = dependentsList.filter((dependent) =>
    dependent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dependent.relation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (id: number) => {
    setDependentsList((prev) =>
      prev.map((dep) => (dep.id === id ? { ...dep, checked: !dep.checked } : dep))
    );
  };

  const handleEdit = (id: number) => {
    // Navigate to edit dependent
  };

  const handleDelete = (id: number) => {
    setDependentsList((prev) => prev.filter((dep) => dep.id !== id));
  };

  const handleAddDependent = () => {
    // Navigate to add dependent
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Add Button */}
      <View style={styles.headerActions}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dependents..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddDependent}>
          <Ionicons name="add" size={24} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Dependents List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredDependents.map((dependent) => (
          <View key={dependent.id} style={styles.dependentCard}>
            <View style={styles.dependentInfo}>
              <TouchableOpacity onPress={() => {}}>
                <Image source={dependent.img} style={styles.dependentImage} />
              </TouchableOpacity>
              <View style={styles.dependentDetails}>
                <Text style={styles.dependentName}>{dependent.name}</Text>
                <View style={styles.dependentMeta}>
                  <Text style={styles.metaText}>{dependent.relation}</Text>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={styles.metaText}>{dependent.gender}</Text>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={styles.metaText}>{dependent.age}</Text>
                </View>
              </View>
              <View style={styles.bloodGroupContainer}>
                <Text style={styles.bloodGroupLabel}>Blood Group</Text>
                <Text style={styles.bloodGroup}>{dependent.bloodGroup}</Text>
              </View>
            </View>
            <View style={styles.dependentActions}>
              <View style={styles.statusToggle}>
                <Text style={styles.statusLabel}>Active</Text>
                <Switch
                  value={dependent.checked}
                  onValueChange={() => handleToggleStatus(dependent.id)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={dependent.checked ? colors.primary : colors.textLight}
                />
              </View>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleEdit(dependent.id)}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleDelete(dependent.id)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
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
  headerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dependentCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dependentInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dependentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  dependentDetails: {
    flex: 1,
  },
  dependentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  dependentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaSeparator: {
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  bloodGroupContainer: {
    alignItems: 'flex-end',
  },
  bloodGroupLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bloodGroup: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  dependentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.text,
    marginRight: 12,
  },
  actionIcon: {
    padding: 8,
    marginLeft: 8,
  },
});

