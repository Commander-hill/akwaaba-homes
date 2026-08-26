'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'tw' | 'ga' | 'ee';

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    welcome: 'Welcome to Akwaaba Homes',
    findHostel: 'Find Hostels & Rooms',
    myBookings: 'My Bookings',
    payRent: 'Pay Rent',
    messages: 'Direct Messages',
    ghanaCard: 'Ghana Card Verification',
    adminPortal: 'Admin Command Center',
    landlordPortal: 'Landlord Dashboard',
    tenantPortal: 'Tenant Portal',
    takeTour: 'Take Tour',
    logout: 'Logout',
    securityScore: 'Security & Safety Score',
    campusMap: 'Campus Map & Routes',
    verifiedLandlord: 'Verified Landlord'
  },
  tw: {
    welcome: 'Akwaaba ba Akwaaba Homes',
    findHostel: 'Pɛ Fie ne Adan',
    myBookings: 'Me Booking Ahodoɔ',
    payRent: 'Tua Fie Ka',
    messages: 'Nkra ne Nkɔmmɔ',
    ghanaCard: 'Ghana Card Abodin',
    adminPortal: 'Admin Aban Ahenfie',
    landlordPortal: 'Fiewura Dashboard',
    tenantPortal: 'Fiefiewura Portal',
    takeTour: 'Kɔ Tour No Mu',
    logout: 'Fi Mu',
    securityScore: 'Bambɔ ne Ahobammɔ Score',
    campusMap: 'Campus Map ne Awanwa Kwan',
    verifiedLandlord: "Fiewura a W'aagye No Tom"
  },
  ga: {
    welcome: 'Afekhɔɔ Kɛba Akwaaba Homes',
    findHostel: 'Kao Shia kɛ Tsui',
    myBookings: 'Mi Booking-ji',
    payRent: 'Tsua Shia Shika',
    messages: 'Sane kɛ Nkra-ji',
    ghanaCard: 'Ghana Card Ní-le',
    adminPortal: 'Admin Nɔ-ni Buu',
    landlordPortal: 'Shia Tswəlɔ Dashboard',
    tenantPortal: 'Shia Yelɔ Portal',
    takeTour: 'Kwɛ Kwɛmɔ',
    logout: 'Jɛ Mli',
    securityScore: 'Shwɛmɔ kɛ Bɔɔ Score',
    campusMap: 'Campus Map kɛ Gbɛi',
    verifiedLandlord: 'Shia Tswəlɔ ni A-le-ɛ'
  },
  ee: {
    welcome: 'Woezor ɖe Akwaaba Homes',
    findHostel: 'Di Xɔwo kɛ Xɔmetɔwo',
    myBookings: 'Nye Booking-wo',
    payRent: 'Fexe Xɔfe Shika',
    messages: 'Nyo kɛ Nkra-wo',
    ghanaCard: 'Ghana Card Dzesideɖe',
    adminPortal: 'Admin Dzi-ɖu-ɖu Afe',
    landlordPortal: 'Xɔtotɔ Dashboard',
    tenantPortal: 'Xɔxetɔ Portal',
    takeTour: 'Kpɔ Tefe-wo',
    logout: 'Do Le Mli',
    securityScore: 'Dedienɔnɔ Score',
    campusMap: 'Campus Map kɛ Mɔwo',
    verifiedLandlord: 'Xɔtotɔ si Wɔ Dzesi'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('akwaaba_language') as LanguageCode;
      if (savedLang && ['en', 'tw', 'ga', 'ee'].includes(savedLang)) {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('akwaaba_language', lang);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
