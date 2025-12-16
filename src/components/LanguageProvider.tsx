'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'
import pt from '@/locales/pt.json'

type Language = 'es' | 'en' | 'fr' | 'pt'

interface Translations {
  [key: string]: {
    [key: string]: string
  }
}

// Cast to any to avoid strict type checking on JSON imports matching generic Index Signature perfectly 
// or define a stricter type for the JSONs if desired. 
// For now, this is safe as the shape is guaranteed.
const translations: Translations = { 
    es: es as Record<string, string>, 
    en: en as Record<string, string>, 
    fr: fr as Record<string, string>, 
    pt: pt as Record<string, string> 
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es')

  const t = (key: string) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
