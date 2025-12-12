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
    images: [] as string[]
  })
  
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [tempColor, setTempColor] = useState('#000000')

  useEffect(() => {
    fetchProducts()
  }, [])

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
      
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        description: formData.description,
        category: formData.category,
        stock: parseInt(formData.stock) || 0,
        gender: formData.gender,
        is_new: formData.is_new,
        sizes: formData.sizes,
        colors: formData.colors,
        images: allImages,
        image_url: allImages[0] || null
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
      alert('Error saving product')
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
      images: []
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
        images: product.images || []
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
            <option value="Kids">Kids</option>
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
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
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
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{product.category}</td>
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
                                <span className="text-muted-foreground">-</span>
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
              <div className="flex items-center justify-between p-6 border-b border-border">
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

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
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
                      <option value="Men">{t('filters.men')}</option>
                      <option value="Women">{t('filters.women')}</option>
                      <option value="Kids">Kids</option>
                      <option value="Accessories">{t('cat.accessories')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.stock')}</label>
                    <input 
                      type="number" 
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                      placeholder="0"
                    />
                  </div>
                </div>
                
                 {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('dash.desc')}</label>
                  <textarea 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    rows={3} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder={t('dash.desc')}
                  />
                </div>

                {/* Sizes */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('dash.available_sizes')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
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
                      className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                    />
                    <button
                        type="button" 
                        onClick={() => addColor(tempColor)}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                    >
                        {t('dash.click_add_colors')}
                    </button>
                    {formData.colors.length > 5 && (
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, colors: []})}
                            className="ml-auto text-xs text-red-500 hover:text-red-400 underline"
                        >
                            {t('dash.clear_colors')} ({formData.colors.length})
                        </button>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap max-h-[120px] overflow-y-auto p-2 border border-border/30 rounded-xl bg-muted/10">
                    {formData.colors.map((color, i) => (
                      <div key={i} className="relative group shrink-0">
                        <div 
                          className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <button
                          type="button"
                          onClick={() => removeColor(color)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images Upload */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('dash.product_images')}</label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{t('dash.click_upload')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('dash.upload_limit')}</p>
                    </label>
                  </div>

                  {/* Image Previews */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {formData.images.map((url, i) => (
                      <div key={`existing-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                        <Image src={url} alt="" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((preview, i) => (
                      <div key={`preview-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-primary">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Badge */}
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="is-new"
                    checked={formData.is_new}
                    onChange={e => setFormData({...formData, is_new: e.target.checked})}
                    className="w-5 h-5 rounded border-border accent-primary"
                  />
                  <label htmlFor="is-new" className="text-sm font-medium cursor-pointer">
                    {t('dash.mark_new')}
                  </label>
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
