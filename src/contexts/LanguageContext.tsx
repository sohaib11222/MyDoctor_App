import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { setApiLanguage } from '../services/api';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  isReady: boolean;
};

const LANGUAGE_STORAGE_KEY = 'app_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const normalizeLang = (lang: string) => {
  const cleaned = String(lang || '').trim();
  if (!cleaned) return 'en';
  return cleaned;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const device = Localization.getLocales?.()?.[0]?.languageTag;
        const initial = normalizeLang(stored || device || 'en');
        setLanguageState(initial);
        setApiLanguage(initial);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  const setLanguage = async (lang: string) => {
    const normalized = normalizeLang(lang);
    setLanguageState(normalized);
    setApiLanguage(normalized);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  };

  const value = useMemo(() => ({ language, setLanguage, isReady }), [language, isReady]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};

export { LANGUAGE_STORAGE_KEY };
