'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { Star, User, Trash2, MessageSquare, Save, X, Reply, Pencil } from 'lucide-react'
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
  // Delete Confirmation State
  const [deleteData, setDeleteData] = useState<{ isOpen: boolean, type: 'review' | 'reply', id: string } | null>(null)

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

  // Prevent scrolling when modals are open
  useEffect(() => {
    if (isAdding || deleteData?.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isAdding, deleteData])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (isAdding) setIsAdding(false)
            if (deleteData) setDeleteData(null)
            if (replyingTo) setReplyingTo(null)
        }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAdding, deleteData, replyingTo])

  const handleAddReview = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newReview.product_id) return addToast(t('dash.reviews.select_error'), 'error')

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
          addToast(t('dash.reviews.error_add'), 'error')
      } else {
          addToast(t('dash.reviews.success_add'), 'success')
          setIsAdding(false)
          setNewReview({ product_id: '', rating: 5, comment: '', username: 'ThunderXis Admin' })
          fetchReviews()
      }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>

  const handleReply = async (id: string) => {
      await supabase
        .from('reviews')
        .update({ reply: replyText, replied_at: new Date() })
        .eq('id', id)
      
      setReplyingTo(null)
      setReplyText('')
      fetchReviews()
      addToast(t('dash.reviews.success_reply'), 'success')
  }

  const handleDelete = (id: string) => {
    setDeleteData({ isOpen: true, type: 'review', id })
  }

  const handleDeleteReply = (id: string) => {
    setDeleteData({ isOpen: true, type: 'reply', id })
  }

  const confirmDelete = async () => {
      if (!deleteData) return

      if (deleteData.type === 'review') {
        await supabase.from('reviews').delete().eq('id', deleteData.id)
        addToast(t('dash.delete_review'), 'success')
      } else {
        await supabase
            .from('reviews')
            .update({ reply: null, replied_at: null })
            .eq('id', deleteData.id)
        addToast(t('dash.reviews.reply_deleted') || 'Reply deleted', 'success')
      }
      
      fetchReviews()
      setDeleteData(null)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-0">
        {/* ... Header & List ... */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">{t('dash.reviews_title')}</h1>
                <p className="text-muted-foreground mt-1">{t('dash.reviews_subtitle')}</p>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full md:w-auto bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-95"
            >
                + {t('dash.reviews.add_admin')}
            </button>
        </div>

        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Product Info */}
                        <div className="flex items-center gap-3 w-full md:w-56 flex-shrink-0 p-3 bg-muted/30 rounded-xl max-h-min self-start border border-border/50">
                            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border bg-white shadow-sm flex-shrink-0">
                                {review.products?.image_url ? (
                                    <Image src={review.products.image_url} alt="" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs">{t('dash.reviews.no_img')}</div>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{review.products?.name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-xs font-bold">{review.rating}.0</span>
                                </div>
                            </div>
                        </div>

                        {/* Conversation Info */}
                        <div className="flex-1 space-y-6">
                            
                            {/* User Review Bubble */}
                            <div className="flex gap-3 md:gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center shadow-sm">
                                        <User className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap justify-between items-center mb-1 gap-2">
                                        <h3 className="font-bold text-sm text-foreground">{review.username || t('dash.reviews.anon')}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                                            <button 
                                                onClick={() => handleDelete(review.id)}
                                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                title={t('dash.reviews.delete_thread')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-muted/40 p-3 md:p-4 rounded-2xl rounded-tl-none border border-border/50 text-sm leading-relaxed text-foreground">
                                        {review.comment}
                                    </div>
                                </div>
                            </div>

                            {/* Owner Reply Bubble (ThunderXis) */}
                            {(review.reply || replyingTo === review.id) && (
                                <div className="flex gap-3 md:gap-4 flex-row-reverse">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 border border-primary/20 flex items-center justify-center shadow-md text-white font-bold text-xs">
                                            TX
                                        </div>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <div className="flex justify-end items-center mb-1 gap-2 flex-wrap">
                                            {review.replied_at && <span className="text-xs text-muted-foreground">{new Date(review.replied_at).toLocaleDateString()}</span>}
                                            <h3 className="font-bold text-sm text-primary flex items-center gap-1">
                                                ThunderXis <span className="text-[10px] bg-primary/10 px-1.5 rounded text-primary uppercase tracking-wider">{t('dash.owner')}</span>
                                            </h3>
                                            
                                            {/* Reply Actions (Icons) */}
                                            {review.reply && !replyingTo && (
                                                <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                                                    <button 
                                                        onClick={() => { setReplyingTo(review.id); setReplyText(review.reply); }}
                                                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                                        title={t('dash.reviews.edit')}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteReply(review.id)}
                                                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                                        title={t('dash.reviews.delete_reply')}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm text-muted-foreground mb-4 bg-muted/30 p-3 rounded-lg text-left">
                      <div>
                        <span className="text-muted-foreground text-xs uppercase font-bold">{t('dash.product')}</span>
                        <p className="font-medium text-foreground truncate">{review.productName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs uppercase font-bold">{t('dash.rating')}</span>
                        <div className="flex text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>{replyingTo === review.id ? (
                                            <div className="bg-white border-2 border-primary/20 p-4 rounded-2xl rounded-tr-none shadow-sm text-left">
                                                <textarea 
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none resize-none placeholder:text-muted-foreground/50"
                                                    placeholder={t('dash.reviews.reply_to').replace('{0}', review.username)}
                                                    rows={3}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border/50">
                                                    <button 
                                                        onClick={() => setReplyingTo(null)}
                                                        className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {t('dash.reviews.cancel')}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReply(review.id)}
                                                        className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <Reply className="w-3 h-3" /> {t('dash.reviews.send')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-primary/5 p-3 md:p-4 rounded-2xl rounded-tr-none border border-primary/10 text-sm leading-relaxed text-foreground text-left inline-block max-w-full md:max-w-[90%]">
                                                {review.reply}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions if no reply yet or not replying */}
                            {!review.reply && !replyingTo && (
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                                        className="text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                                    >
                                        <Reply className="w-3.5 h-3.5" /> {t('dash.reply')}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-4 border-b border-border bg-muted/20">
                        <h3 className="font-bold">{t('dash.reviews.add_admin')}</h3>
                        <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleAddReview} className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold mb-1.5 block uppercase text-muted-foreground">{t('dash.product')}</label>
                            <select 
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                                value={newReview.product_id}
                                onChange={e => setNewReview({...newReview, product_id: e.target.value})}
                                required
                            >
                                <option value="">{t('dash.reviews.select_product')}</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1.5 block uppercase text-muted-foreground">{t('dash.rating')}</label>
                            <div className="flex gap-2 bg-muted/30 p-2 rounded-xl w-fit">
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
                            <label className="text-xs font-bold mb-1.5 block uppercase text-muted-foreground">{t('dash.reviews.username')}</label>
                            <input 
                                type="text"
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                                value={newReview.username}
                                onChange={e => setNewReview({...newReview, username: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1.5 block uppercase text-muted-foreground">{t('dash.reviews.comment')}</label>
                            <textarea 
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm h-28 focus:ring-2 ring-primary/20 outline-none resize-none"
                                value={newReview.comment}
                                onChange={e => setNewReview({...newReview, comment: e.target.value})}
                                placeholder={t('dash.reviews.content_placeholder')}
                                required
                            />
                        </div>
                        <button className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 mt-2">
                            {t('dash.reviews.post')}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteData && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-destructive/20 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {deleteData.type === 'review' 
                                    ? (t('dash.delete_review_title') || 'Delete Review?')
                                    : (t('dash.delete_reply_title') || 'Delete Reply?')
                                }
                            </h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {deleteData.type === 'review'
                                    ? (t('dash.delete_review_confirm') || 'This will permanently remove this review and any replies. This action cannot be undone.')
                                    : (t('dash.delete_reply_confirm') || 'This will permanently remove your reply to this review.')
                                }
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setDeleteData(null)}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors"
                            >
                                {t('dash.cancel')}
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
                            >
                                {t('reviews.delete')}
                            </button>
                        </div>
                    </div>
                </div>
             </div>
        )}
    </div>
  )
}
