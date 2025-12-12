'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { Star, User, Trash2, MessageSquare, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'

export default function DashboardReviewsPage() {
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // New Review State
  const [isAdding, setIsAdding] = useState(false)
  const [newReview, setNewReview] = useState({ product_id: '', rating: 5, comment: '', username: 'ThunderXis Admin' })
  const [products, setProducts] = useState<any[]>([])

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
            *,
            products ( name, image_url )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Error fetching reviews:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('id, name')
      setProducts(data || [])
  }

  useEffect(() => {
    fetchReviews()
    fetchProducts()
  }, [])

  const handleAddReview = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newReview.product_id) return addToast('Select a product', 'error')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('reviews').insert({
          user_id: user.id,
          product_id: newReview.product_id,
          rating: newReview.rating,
          comment: newReview.comment,
          username: newReview.username,
          created_at: new Date().toISOString()
      })

      if (error) {
          console.error(error)
          addToast('Error adding review', 'error')
      } else {
          addToast('Review added successfully', 'success')
          setIsAdding(false)
          setNewReview({ product_id: '', rating: 5, comment: '', username: 'ThunderXis Admin' })
          fetchReviews()
      }
  }

  if (loading) return <div className="p-8">Loading...</div>

  const handleDelete = async (id: string) => {
    if (!confirm(t('dash.delete_review') + '?')) return
    await supabase.from('reviews').delete().eq('id', id)
    fetchReviews()
    addToast('Review deleted', 'success')
  }

  const handleReply = async (id: string) => {
      await supabase
        .from('reviews')
        .update({ reply: replyText, replied_at: new Date() })
        .eq('id', id)
      
      setReplyingTo(null)
      setReplyText('')
      fetchReviews()
      addToast('Reply posted', 'success')
  }



  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{t('dash.reviews_title')}</h1>
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
                + {t('dash.add_review') || 'Add Admin Review'}
            </button>
        </div>

        <div className="grid gap-4">
            {reviews.map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Product Info */}
                        <div className="flex items-center gap-3 w-full md:w-48 flex-shrink-0">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border">
                                {review.products?.image_url && (
                                    <Image src={review.products.image_url} alt="" fill className="object-cover" />
                                )}
                            </div>
                            <p className="text-xs font-bold line-clamp-2">{review.products?.name}</p>
                        </div>

                        {/* Review Content */}
                        <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-1.5 rounded-full">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{review.username || 'Anonymous'}</p>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 italic">
                                "{review.comment}"
                            </p>

                            {/* Existing Reply */}
                            {review.reply && !replyingTo && (
                                <div className="ml-8 mt-2 p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
                                    <p className="text-xs font-bold text-primary mb-1">{t('dash.replied')}:</p>
                                    <p className="text-sm">{review.reply}</p>
                                </div>
                            )}

                            {/* Reply Input */}
                            {replyingTo === review.id ? (
                                <div className="mt-4 space-y-2">
                                    <textarea 
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="w-full bg-background border border-border p-3 rounded-lg text-sm focus:ring-2 ring-primary/20 outline-none"
                                        placeholder={t('dash.reply_placeholder')}
                                        rows={3}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => setReplyingTo(null)}
                                            className="px-3 py-1.5 text-xs font-bold border border-border rounded-lg hover:bg-muted"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => handleReply(review.id)}
                                            className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5"
                                        >
                                            <Save className="w-3 h-3" /> {t('dash.reply_save')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2 pt-2">
                                     <button 
                                        onClick={() => { setReplyingTo(review.id); setReplyText(review.reply || ''); }}
                                        className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> {t('dash.reply')}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(review.id)}
                                        className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> {t('dash.delete_review')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Add Review Modal */}
        {isAdding && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-border">
                        <h3 className="font-bold">{t('dash.add_review') || 'Add Admin Review'}</h3>
                        <button onClick={() => setIsAdding(false)}><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleAddReview} className="p-4 space-y-4">
                        <div>
                            <label className="text-xs font-bold mb-1 block">Product</label>
                            <select 
                                className="w-full bg-background border border-border rounded-lg p-2 text-sm"
                                value={newReview.product_id}
                                onChange={e => setNewReview({...newReview, product_id: e.target.value})}
                                required
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1 block">Rating</label>
                            <div className="flex gap-2">
                                {[1,2,3,4,5].map(star => (
                                    <button 
                                        type="button"
                                        key={star}
                                        onClick={() => setNewReview({...newReview, rating: star})}
                                        className={`p-1 transition-transform hover:scale-110 ${star <= newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                                    >
                                        <Star className={`w-6 h-6 ${star <= newReview.rating ? 'fill-current' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1 block">Username Display</label>
                            <input 
                                type="text"
                                className="w-full bg-background border border-border rounded-lg p-2 text-sm"
                                value={newReview.username}
                                onChange={e => setNewReview({...newReview, username: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1 block">Comment</label>
                            <textarea 
                                className="w-full bg-background border border-border rounded-lg p-2 text-sm h-24"
                                value={newReview.comment}
                                onChange={e => setNewReview({...newReview, comment: e.target.value})}
                                placeholder="Review content..."
                                required
                            />
                        </div>
                        <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90">
                            Post Review
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  )
}
