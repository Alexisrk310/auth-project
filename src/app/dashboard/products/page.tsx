'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Loader2, Search, Upload, X, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { TableSkeleton } from '@/components/dashboard/skeletons'

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
}

import { useLanguage } from '@/components/LanguageProvider'

export default function ProductsPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
  const [tempColor, setTempColor] = useState('#000000') // State for color picker

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    const uploadedUrls: string[] = []
    
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (!uploadError) {
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)
        
        uploadedUrls.push(data.publicUrl)
      }
    }
    
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      // Upload new images
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
        image_url: allImages[0] || null // Fallback validation for legacy support
      }

      let error;

      if (editingProduct) {
        const { error: updateError } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase.from('products').insert([payload])
        error = insertError
      }
      
      if (error) throw error;

      setIsModalOpen(false)
      fetchProducts()
      resetForm()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(`${t('dash.error_save_product')}: ${error.message || error}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('dash.delete_confirm'))) return
    
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      fetchProducts()
    } else {
      alert(t('dash.error_delete_product'))
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

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }))
  }

  const addColor = (color: string) => {
    if (color && !formData.colors.includes(color)) {
      setFormData(prev => ({ ...prev, colors: [...prev.colors, color] }))
    }
  }

  const removeColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c !== color)
    }))
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dash.product_management')}</h1>
          <p className="text-muted-foreground">{t('dash.manage_inventory')}</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/30"
        >
          <Plus className="w-5 h-5" /> {t('dash.add_product')}
        </button>
      </div>

      {/* Product List */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('dash.search_products')} 
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-4">
             <TableSkeleton rows={8} columns={5} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {searchTerm ? t('dash.no_products') : t('dash.add_first')}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4 text-left">{t('dash.product_name')}</th>
                <th className="px-6 py-4 text-left">{t('dash.category')}</th>
                <th className="px-6 py-4 text-left">{t('dash.stock')}</th>
                <th className="px-6 py-4 text-left">{t('dash.price')}</th>
                <th className="px-6 py-4 text-right">{t('dash.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="group hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted relative overflow-hidden border border-border/50">
                        {product.images?.[0] && (
                          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">{product.name}</span>
                        {product.is_new && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">NEW</span>
                        )}
                        {product.sale_price && product.sale_price < product.price && (
                           <span className="ml-2 text-xs bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                             -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                           </span>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{product.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{product.category}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-medium ${product.stock && product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {product.stock || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold">
                    {product.sale_price && product.sale_price < product.price ? (
                        <div className="flex flex-col">
                            <span className="text-rose-600">${product.sale_price.toLocaleString('es-CO')}</span>
                            <span className="text-xs text-muted-foreground line-through font-normal">${product.price.toLocaleString('es-CO')}</span>
                        </div>
                    ) : (
                        <span>${product.price.toLocaleString('es-CO')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openModal(product)} 
                        className="p-2 hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Pencil className="w-4 h-4 text-primary" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)} 
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border/50 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black">{editingProduct ? t('dash.edit_product') : t('dash.new_product')}</h2>
                  <p className="text-sm text-muted-foreground">{t('dash.product_details')}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.product_name')} *</label>
                    <input 
                      required 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder={t('dash.product_name')}
                    />
                  </div>
                </div>
                {/* Price & Sale Price */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.price')} *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: e.target.value})} 
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-red-400">{t('dash.sale_price_label')}</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-background border border-red-500/30 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50" 
                      value={formData.sale_price || ''} 
                      onChange={e => setFormData({...formData, sale_price: e.target.value})} 
                      placeholder={t('dash.sale_price_placeholder')}
                    />
                  </div>
                </div>

                {/* Category, Stock, Gender */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.category')}</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">{t('dash.select_category')}</option>
                      <option value="Hoodies">Hoodies</option>
                      <option value="T-Shirts">T-Shirts</option>
                      <option value="Pants">Pants</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Caps">Caps</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Jackets">Jackets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.stock')}</label>
                    <input 
                      type="number" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{t('dash.gender')}</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={formData.gender} 
                      onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="unisex">Unisex</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
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
                            Clear All ({formData.colors.length})
                        </button>
                    )}
                  </div>
                  
                  {/* SCROLLABLE CONTAINER FIX */}
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
