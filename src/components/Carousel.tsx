'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/LanguageProvider'



export default function Carousel() {
  const [current, setCurrent] = useState(0)
  const { t } = useLanguage()

  const slides = [
    {
      id: 1,
      image: '/images/hero_1.png', 
      title: 'NEON DYSTOPIA',
      subtitle: t('hero.subtitle'),
      cta: t('hero.cta')
    },
    {
      id: 2,
      image: '/images/hero_2.png', 
      title: 'NOIR SERIES',
      subtitle: t('hero.subtitle'),
      cta: t('hero.cta')
    },
    {
      id: 3,
      image: '/images/hero_3.png', 
      title: 'URBAN ARMOR',
      subtitle: t('hero.subtitle'),
      cta: t('hero.cta')
    }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, []) // Removed dependency on slides length as it is constant now inside

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
           key={current}
           initial={{ opacity: 0, scale: 1.1 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.7 }}
           className="absolute inset-0"
        >
           <Image 
             src={slides[current].image}
             alt={slides[current].title}
             fill
             className="object-cover opacity-60"
             priority
           />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-6 max-w-4xl px-4 pointer-events-auto">
             <motion.h1 
               key={`h1-${current}`}
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="text-5xl md:text-8xl font-black tracking-tighter text-white"
             >
                {slides[current].title}
             </motion.h1>
             <motion.p 
                key={`p-${current}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-2xl text-gray-200"
             >
                {slides[current].subtitle}
             </motion.p>
             <motion.div
                key={`btn-${current}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
             >
                <Button size="lg" className="rounded-full px-8 py-6 text-lg bg-primary hover:bg-primary/80">
                   {slides[current].cta}
                </Button>
             </motion.div>
          </div>
      </div>

       {/* Controls */}
       <button onClick={prevSlide} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-1 md:p-2 bg-black/50 hover:bg-primary text-white rounded-full backdrop-blur-sm transition-all z-10">
          <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
       </button>
       <button onClick={nextSlide} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-1 md:p-2 bg-black/50 hover:bg-primary text-white rounded-full backdrop-blur-sm transition-all z-10">
          <ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
       </button>
       
       {/* Dots */}
       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {slides.map((_, index) => (
             <button
               key={index}
               onClick={() => setCurrent(index)}
               className={`w-3 h-3 rounded-full transition-all ${index === current ? 'bg-primary w-8' : 'bg-white/50 hover:bg-white'}`}
             />
          ))}
       </div>
    </div>
  )
}
