/**
 * Profile Settings Tab Order
 * Defines the sequence of tabs for doctor profile completion flow
 */
export type TabType = 'basic' | 'specialties' | 'experience' | 'education' | 'awards' | 'clinics' | 'insurance' | 'business' | 'social';

export const PROFILE_SETTINGS_TABS: Array<{ key: TabType; name: string }> = [
  {
    key: 'basic',
    name: 'Basic Details',
  },
  {
    key: 'specialties',
    name: 'Specialties & Services',
  },
  {
    key: 'experience',
    name: 'Experience',
  },
  {
    key: 'education',
    name: 'Education',
  },
  {
    key: 'awards',
    name: 'Awards',
  },
  {
    key: 'clinics',
    name: 'Clinics',
  },
  {
    key: 'insurance',
    name: 'Insurance',
  },
  {
    key: 'business',
    name: 'Business Hours',
  },
  {
    key: 'social',
    name: 'Social Media',
  },
];

/**
 * Get the next tab in the sequence
 * @param currentTab - Current tab key
 * @returns Next tab key or null if current is last
 */
export const getNextTab = (currentTab: TabType): TabType | null => {
  const currentIndex = PROFILE_SETTINGS_TABS.findIndex(tab => tab.key === currentTab);
  if (currentIndex === -1 || currentIndex === PROFILE_SETTINGS_TABS.length - 1) {
    return null; // Current tab not found or is the last tab
  }
  return PROFILE_SETTINGS_TABS[currentIndex + 1].key;
};

/**
 * Get the current tab index
 * @param currentTab - Current tab key
 * @returns Tab index or -1 if not found
 */
export const getCurrentTabIndex = (currentTab: TabType): number => {
  return PROFILE_SETTINGS_TABS.findIndex(tab => tab.key === currentTab);
};
