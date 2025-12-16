'use client'

import { useStoreConfig } from '@/store/useStoreConfig'
import { useLanguage } from '@/components/LanguageProvider'
import { motion } from 'framer-motion'
import { Save } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const { storeName, storeType, setStoreName, setStoreType } = useStoreConfig()
  const { t } = useLanguage()
  const [localName, setLocalName] = useState(storeName)
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setStoreName(localName)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dash.settings_title')}</h1>
        <p className="text-muted-foreground">{t('dash.settings_desc')}</p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <section className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">{t('dash.settings_general')}</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('dash.store_name')}</label>
              <input 
                type="text" 
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2"
                placeholder="My Awesome Store"
              />
            </div>
            
             <div className="space-y-2">
              <label className="text-sm font-medium">{t('dash.store_type')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['clothing', 'restaurant', 'tech', 'other'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setStoreType(type)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      storeType === type 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="capitalize font-medium block">{type}</span>
                    <span className="text-xs text-muted-foreground">
                      {type === 'clothing' && t('dash.type_clothing')}
                      {type === 'restaurant' && t('dash.type_restaurant')}
                      {type === 'tech' && t('dash.type_tech')}
                      {type === 'other' && t('dash.type_other')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
           <div className="mt-6 flex justify-end">
             <button
                onClick={handleSave}
                disabled={loading}
                className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 flex items-center gap-2"
             >
               {loading ? t('dash.saving') : <><Save className="w-4 h-4" /> {t('profile.save')}</>}
             </button>
           </div>
        </section>
      </div>
    </div>
  )
}
