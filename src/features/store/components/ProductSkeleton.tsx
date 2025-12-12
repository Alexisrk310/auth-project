'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function ProductSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm">
      {/* Image Skeleton */}
      <div className="relative aspect-[3/4] bg-muted/30 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
      </div>

      {/* Content Skeleton */}
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-2">
            {/* Category */}
            <div className="h-3 w-16 bg-muted/40 rounded-full animate-pulse" />
            {/* Title */}
            <div className="h-5 w-3/4 bg-muted/50 rounded-lg animate-pulse" />
          </div>
          {/* Price */}
          <div className="h-6 w-20 bg-muted/50 rounded-lg animate-pulse" />
        </div>
        
        {/* Description lines */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full bg-muted/30 rounded-full animate-pulse" />
          <div className="h-3 w-2/3 bg-muted/30 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}
