'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast'

interface ReviewFormProps {
  productId: string
  onReviewSubmitted: () => void
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        addToast(t('reviews.login_to_write'), 'error')
        return
      }

      // Get profile for username (optional, if you have profile table)
      // For now we might just use email or metadata if available, 
      // or we can rely on the trigger/join. 
      // Let's assume we want to store a display name.
      const username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous'

      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: user.id,
          rating,
          comment,
          username
        })

      if (error) throw error

      addToast(t('reviews.success'), 'success')
      setRating(0)
      setComment('')
      onReviewSubmitted()
      
    } catch (error) {
      console.error('Error submitting review:', error)
      addToast(t('order_error'), 'error') // Fallback generic error
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-lg">{t('reviews.write')}</h3>
      
      {/* Star Rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          >
            <Star 
              className={`w-8 h-8 ${
                (hoverRating || rating) >= star 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-muted-foreground'
              }`} 
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('reviews.comment_placeholder')}
        className="w-full bg-background border border-border rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
        required
      />

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {loading ? '...' : t('reviews.submit')}
      </button>
    </form>
  )
}
