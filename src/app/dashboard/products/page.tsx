'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Loader2, Search, Upload, X, Image as ImageIcon, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { TableSkeleton } from '@/components/dashboard/skeletons'
import { useLanguage } from '@/components/LanguageProvider'

interface Product {
  id: string
  name: string
  price: number
  sale_price?: number
  description: string
  category: string
  images: string[]
  stock: number
  gender?: 'men' | 'women' | 'unisex'
  is_new?: boolean
  sizes?: string[]
  colors?: string[]
  created_at?: string
  rating?: number // Legacy
  reviews?: { rating: number }[]
  stock_by_size?: Record<string, number>
}

export default function ProductsPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('all')
  const [filterRating, setFilterRating] = useState('')
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterSize, setFilterSize] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sale_price: '',
    description: '',
    category: '',
    stock: '',
    gender: 'unisex' as 'men' | 'women' | 'unisex',
    is_new: false,
    sizes: [] as string[],
    colors: [] as string[],
    images: [] as string[],
    manageStockBySize: false,
    stock_by_size: {} as Record<string, number>
  })
  
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [tempColor, setTempColor] = useState('#000000')

  useEffect(() => {
    fetchProducts()
  }, [])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isModalOpen])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isModalOpen])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*, reviews(rating)')
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setProducts(data as unknown as Product[])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setImageFiles(prev => [...prev, ...files])
      
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    const urls: string[] = []
    
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)
        
      urls.push(data.publicUrl)
    }
    
    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      const uploadedImages = await uploadImages()
      const allImages = [...formData.images, ...uploadedImages]
      
      const stockValue = formData.manageStockBySize 
        ? Object.values(formData.stock_by_size).reduce((a, b) => a + b, 0)
        : (parseInt(formData.stock) || 0)

      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        description: formData.description,
        category: formData.category,
        stock: stockValue,
        gender: formData.gender,
        is_new: formData.is_new,
        sizes: formData.sizes,
        colors: formData.colors,
        images: allImages,
        image_url: allImages[0] || null,
        stock_by_size: formData.manageStockBySize ? formData.stock_by_size : null
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload)
        
        if (error) throw error
      }

      await fetchProducts()
      setIsModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(t('dash.error_save_product'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('dash.confirm_delete'))) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      sale_price: '',
      description: '',
      category: '',
      stock: '',
      gender: 'unisex',
      is_new: false,
      sizes: [],
      colors: [],
      images: [],
      manageStockBySize: false,
      stock_by_size: {}
    })
    setImageFiles([])
    setImagePreviews([])
    setEditingProduct(null)
  }

  const openModal = (product: Product | null = null) => {
    setEditingProduct(product)
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        sale_price: product.sale_price ? product.sale_price.toString() : '',
        description: product.description || '',
        category: product.category || '',
        stock: product.stock?.toString() || '0',
        gender: (product.gender?.toLowerCase() as any) || 'unisex',
        is_new: product.is_new || false,
        sizes: product.sizes || [],
        colors: product.colors || [],
        images: product.images || [],
        manageStockBySize: !!product.stock_by_size,
        stock_by_size: product.stock_by_size || {}
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const getAverageRating = (product: Product) => {
     if (!product.reviews || product.reviews.length === 0) return 0;
     const sum = product.reviews.reduce((acc, curr) => acc + curr.rating, 0);
     return sum / product.reviews.length;
  }

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }))
  }

  const addColor = (color: string) => {
    if (!formData.colors.includes(color)) {
      setFormData(prev => ({ ...prev, colors: [...prev.colors, color] }))
    }
  }

  const removeColor = (color: string) => {
    setFormData(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }))
  }

  const filteredProducts = products.filter(p => {
    const avgRating = getAverageRating(p)
    
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory ? p.category === filterCategory : true
    const matchesSize = filterSize ? p.sizes?.includes(filterSize) : true
    
    const matchesStock = filterStock === 'all' ? true :
      filterStock === 'in_stock' ? p.stock > 0 :
      filterStock === 'low_stock' ? p.stock > 0 && p.stock < 5 :
      filterStock === 'out_of_stock' ? p.stock === 0 : true

    const matchesRating = filterRating ? avgRating >= parseFloat(filterRating) : true

    const price = p.sale_price || p.price
    const matchesMinPrice = filterMinPrice ? price >= parseFloat(filterMinPrice) : true
    const matchesMaxPrice = filterMaxPrice ? price <= parseFloat(filterMaxPrice) : true

    return matchesSearch && matchesCategory && matchesSize && matchesStock && matchesRating && matchesMinPrice && matchesMaxPrice
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {t('dash.products_title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('dash.products_desc')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/25 font-medium"
        >
          <Plus className="w-5 h-5" />
          {t('dash.add_product')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('dash.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">{t('dash.all_categories')}</option>
            <option value="Men">{t('filters.men')}</option>
            <option value="Women">{t('filters.women')}</option>
            <option value="Kids">{t('cat.kids')}</option>
            <option value="Accessories">{t('cat.accessories')}</option>
          </select>
          <select 
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">{t('dash.all_stock')}</option>
            <option value="in_stock">{t('dash.in_stock')}</option>
            <option value="low_stock">{t('dash.low_stock')}</option>
            <option value="out_of_stock">{t('dash.out_of_stock')}</option>
          </select>
          <select 
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">{t('dash.all_ratings')}</option>
            <option value="4">4+ {t('dash.stars')}</option>
            <option value="3">3+ {t('dash.stars')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {/* Table & Cards */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">{t('dash.product')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">{t('dash.category')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">{t('dash.price')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">{t('dash.stock')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">{t('dash.rating')}</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-muted-foreground">{t('dash.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
                            {product.images[0] ? (
                              <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{t(product.name)}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{t(product.description)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{t(`cat.${product.category?.toLowerCase() || 'streetwear'}`)}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        ${product.price}
                      </td>
                      <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.stock === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              product.stock < 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                              {product.stock}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                          {(() => {
                              const avg = getAverageRating(product);
                              return avg > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                      <span className="font-bold">{avg.toFixed(1)}</span>
                                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                      <span className="text-[10px] text-muted-foreground">({product.reviews?.length})</span>
                                  </div>
                              ) : (
                                  <span className="text-muted-foreground">{t('dash.no_reviews')}</span>
                              )
                          })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openModal(product)}
                            className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm line-clamp-1">{t(product.name)}</h3>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openModal(product)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">{t(`cat.${product.category?.toLowerCase() || 'streetwear'}`)}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-sm bg-muted/30 px-2 py-0.5 rounded-md border border-border/50">${product.price}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        product.stock === 0 ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900' :
                        product.stock < 5 ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900' :
                        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900'
                    }`}>
                        {product.stock} {t('dash.stock_suffix')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                <h2 className="text-xl font-bold">
                  {editingProduct ? t('dash.edit_product') : t('dash.add_product')}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Media (5 cols) */}
                  <div className="md:col-span-5 space-y-4">
                     <div>
                        <label className="block text-sm font-semibold mb-2">{t('dash.product_images')}</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-muted/5">
                          <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer block">
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium">{t('dash.click_upload')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('dash.upload_limit')}</p>
                          </label>
                        </div>
                     </div>

                     {/* Image Previews */}
                     {(formData.images.length > 0 || imagePreviews.length > 0) && (
                        <div className="grid grid-cols-3 gap-2">
                          {formData.images.map((url, i) => (
                            <div key={`existing-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                              <Image src={url} alt="" fill className="object-cover" />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {imagePreviews.map((preview, i) => (
                            <div key={`preview-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-primary">
                              <img src={preview} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                     )}
                  </div>

                  {/* Right Column: Details (7 cols) */}
                  <div className="md:col-span-7 space-y-5">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">{t('dash.product_name')}</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder={t('dash.product_name')}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">{t('dash.desc')}</label>
                      <textarea 
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
                        rows={3} 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        placeholder={t('dash.desc')}
                      />
                    </div>

                    {/* Pricing Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">{t('dash.price')}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="number" 
                            required
                            className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                            value={formData.price} 
                            onChange={e => setFormData({...formData, price: e.target.value})} 
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">{t('dash.sale_price')}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="number" 
                            className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                            value={formData.sale_price} 
                            onChange={e => setFormData({...formData, sale_price: e.target.value})} 
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">{t('dash.category')}</label>
                        <select 
                          required
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value})} 
                        >
                          <option value="">{t('dash.select_category')}</option>
                          <option value="T-Shirts">{t('cat.tshirts')}</option>
                          <option value="Hoodies">{t('cat.hoodies')}</option>
                          <option value="Pants">{t('cat.pants')}</option>
                          <option value="Jackets">{t('cat.jackets')}</option>
                          <option value="Footwear">{t('cat.footwear')}</option>
                          <option value="Accessories">{t('cat.accessories')}</option>
                          <option value="Caps">{t('cat.caps')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">{t('dash.gender')}</label>
                        <select 
                          required
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                          value={formData.gender} 
                          onChange={e => setFormData({...formData, gender: e.target.value as any})} 
                        >
                          <option value="unisex">{t('dash.gender_unisex')}</option>
                          <option value="men">{t('dash.gender_men')}</option>
                          <option value="women">{t('dash.gender_women')}</option>
                        </select>
                      </div>
                    </div>

                    {/* New Badge Checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                       <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            id="is-new"
                            checked={formData.is_new}
                            onChange={e => setFormData({...formData, is_new: e.target.checked})}
                            className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
                          />
                          <label htmlFor="is-new" className="text-sm font-medium cursor-pointer select-none">
                            {t('dash.mark_new')}
                          </label>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Inventory & Variants */}
                <div className="border-t border-border pt-6 space-y-6">
                    <h3 className="text-lg font-bold">{t('dash.inventory_distribution')} & {t('dash.variants')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sizes */}
                        <div>
                          <label className="block text-sm font-semibold mb-2">{t('dash.available_sizes')}</label>
                          <div className="flex gap-2 flex-wrap">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(size)}
                                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                  formData.sizes.includes(size)
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Colors */}
                        <div>
                          <label className="block text-sm font-semibold mb-2">{t('dash.colors')}</label>
                          <div className="flex gap-2 items-center mb-3">
                            <input 
                              type="color"
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                              value={tempColor}
                              onChange={(e) => setTempColor(e.target.value)}
                            />
                            <button
                                type="button" 
                                onClick={() => addColor(tempColor)}
                                className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                            >
                                {t('dash.click_add_colors')}
                            </button>
                            {formData.colors.length > 5 && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, colors: []})}
                                    className="ml-auto text-xs text-red-500 hover:text-red-400 underline"
                                >
                                    {t('dash.clear_colors')}
                                </button>
                            )}
                          </div>
                          
                          <div className="flex gap-2 flex-wrap min-h-[40px]">
                            {formData.colors.map((color, i) => (
                              <div key={i} className="relative group shrink-0">
                                <div 
                                  className="w-8 h-8 rounded-full border border-border shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeColor(color)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>

                    {/* Stock Table */}
                     <div>
                        <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="checkbox"
                                    id="manage-stock"
                                    checked={formData.manageStockBySize}
                                    onChange={(e) => setFormData({...formData, manageStockBySize: e.target.checked})}
                                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                                 />
                                 <label htmlFor="manage-stock" className="text-sm font-medium cursor-pointer select-none">
                                    {t('dash.stock_by_size')}
                                 </label>
                             </div>
                        </div>

                        {!formData.manageStockBySize ? (
                            <div className="max-w-xs">
                                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">{t('dash.stock')}</label>
                                <input 
                                type="number" 
                                required={!formData.manageStockBySize}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                                value={formData.stock} 
                                onChange={e => setFormData({...formData, stock: e.target.value})} 
                                placeholder="0"
                                />
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">{t('dash.inventory_distribution')}</h3>
                                    <div className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
                                        {t('dash.total_calculated')}: <span className="font-bold text-sm ml-1">
                                            {Object.values(formData.stock_by_size).reduce((a, b) => a + b, 0)}
                                        </span>
                                    </div>
                                </div>
                                
                                {formData.sizes.length === 0 ? (
                                    <div className="p-8 text-center">
                                         <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="text-xl">📏</span>
                                         </div>
                                         <p className="text-sm text-muted-foreground font-medium mb-1">{t('dash.no_sizes_selected')}</p>
                                         <p className="text-xs text-muted-foreground/70">{t('dash.select_sizes_first')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            <div className="col-span-3 md:col-span-2">{t('dash.size')}</div>
                                            <div className="col-span-5 md:col-span-4">{t('dash.stock')}</div>
                                            <div className="col-span-4 md:col-span-6 text-right md:text-left">{t('dash.status')}</div>
                                        </div>
                                        {formData.sizes.map(size => {
                                            const qty = formData.stock_by_size[size] || 0;
                                            let statusColor = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
                                            let statusText = 'dash.out_of_stock';
                                            
                                            if (qty > 0) {
                                                if (qty < 5) {
                                                    statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
                                                    statusText = 'dash.low_stock';
                                                } else {
                                                    statusColor = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
                                                    statusText = 'dash.in_stock';
                                                }
                                            }

                                            return (
                                                <div key={size} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                                                    <div className="col-span-3 md:col-span-2">
                                                        <div className="w-10 h-8 flex items-center justify-center bg-background border border-border rounded-md font-bold text-sm shadow-sm ring-1 ring-border/50">
                                                            {size}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-5 md:col-span-4">
                                                        <div className="relative">
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                className="w-full bg-background border border-border rounded-lg pl-3 pr-12 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:border-primary/50"
                                                                placeholder="0"
                                                                value={formData.stock_by_size[size] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        stock_by_size: {
                                                                            ...prev.stock_by_size,
                                                                            [size]: val
                                                                        }
                                                                    }))
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-muted-foreground pointer-events-none font-medium bg-background pl-1">
                                                                {t('dash.quantity_units')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 md:col-span-6 flex justify-end md:justify-start">
                                                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${statusColor}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${qty === 0 ? 'bg-red-500' : qty < 5 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                                            {t(statusText)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border/50">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted/50 font-semibold transition-all"
                    disabled={uploading}
                  >
                    {t('dash.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('dash.uploading')}
                      </span>
                    ) : t('dash.save_product')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
