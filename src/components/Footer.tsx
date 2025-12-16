'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Mail, MapPin, Phone } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-black border-t border-white/5 pt-16 pb-8 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 transition-colors">
                 <span className="font-bold text-primary">T</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ThunderXis
              </span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex gap-4 pt-2">
                <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-primary transition-colors"><Facebook className="w-4 h-4" /></Link>
                <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-primary transition-colors"><Twitter className="w-4 h-4" /></Link>
                <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-primary transition-colors"><Instagram className="w-4 h-4" /></Link>
            </div>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="font-bold mb-6 text-white">{t('footer.shop')}</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><Link href="/shop" className="hover:text-primary transition-colors">{t('footer.links.men')}</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors">{t('footer.links.women')}</Link></li>
              <li><Link href="/descuentos" className="hover:text-primary transition-colors">{t('footer.links.sale')}</Link></li>
              <li><Link href="/category/accessories" className="hover:text-primary transition-colors">{t('cat.accessories')}</Link></li>
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-bold mb-6 text-white">{t('footer.help')}</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-primary transition-colors">{t('footer.help.shipping')}</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">{t('footer.help.returns')}</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">{t('footer.help.contact')}</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">{t('footer.legal')}</Link></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="font-bold mb-6 text-white">{t('footer.newsletter')}</h4>
            <p className="text-sm text-zinc-400 mb-4">{t('footer.newsletter.desc')}</p>
            <form action={async (formData) => {
                  const { subscribeToNewsletter } = await import('@/app/newsletter-actions')
                  const res = await subscribeToNewsletter(formData)
                  if (res?.error) {
                    alert(res.error) // Replace with toast if available
                  } else {
                    alert('Subscribed!')
                  }
               }} className="flex gap-2">
                  <input 
                    name="email"
                    type="email" 
                    placeholder={t('auth.email_placeholder')}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-white placeholder:text-zinc-600"
                    required
                  />
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                     {t('footer.subscribe_btn')}
                  </button>
               </form>
            <div className="mt-6 space-y-2">
                 <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{t('footer.address')}</span>
                 </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                     <Phone className="w-3 h-3 text-primary" />
                     <span>{t('footer.phone')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                     <Mail className="w-3 h-3 text-primary" />
                     <span>{t('footer.email')}</span>
                  </div>
            </div>
          </div>

        </div>
        
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} ThunderXis. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}
