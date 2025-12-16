'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Truck, CheckCircle, Clock, AlertCircle, Loader2, Package, X, AlertTriangle, Eye, MapPin, Phone, Calendar, MoreVertical, Filter, ChevronDown, User, Mail, CreditCard } from 'lucide-react'
import { OrderCardSkeleton } from '@/components/dashboard/skeletons'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { updateOrderStatus } from '@/actions/orders'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price_at_time: number
  products?: {
    image_url: string
    images?: string[]
    name: string
  }
}

interface Order {
  id: string
  created_at: string
  customer_name: string
  customer_email?: string
  shipping_address: string
  city: string
  phone: string
  total: number
  status: string
  user_id: string
  carrier?: string
  tracking_number?: string
  payment_info?: any
  order_items: OrderItem[]
}

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

const ActionTooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative flex items-center justify-center" 
      onMouseEnter={() => setIsVisible(true)} 
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(true)}
      onTouchEnd={() => setIsVisible(false)}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: -8 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 whitespace-nowrap bg-foreground text-background text-xs font-bold px-2 py-1 rounded shadow-lg z-10 pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}

export default function DashboardOrders() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  
  // Modal States
  const [confirmData, setConfirmData] = useState<{ id: string, status: string } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedOrder || confirmData) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedOrder, confirmData])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOrder) setSelectedOrder(null)
        if (confirmData) setConfirmData(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedOrder, confirmData])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!order_items_order_id_fkey (
            id,
            product_id,
            quantity,
            price_at_time,
            products (
              image_url,
              images,
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      if (error) console.error('Error Details:', (error as any).message, (error as any).details, (error as any).hint)
    } finally {
      setLoading(false)
    }
  }

  const initiateUpdate = (orderId: string, newStatus: string) => {
    setConfirmData({ id: orderId, status: newStatus })
    setCarrier('')
    setTrackingNumber('')
  }

  const performUpdate = async () => {
    if (!confirmData) return
    
    const { id, status } = confirmData
    setUpdatingOrder(id)
    setConfirmData(null)

    try {
      const result = await updateOrderStatus(id, status, carrier, trackingNumber)

      if (result.success) {
        await fetchOrders()
          // Update selected order if open
        if (selectedOrder && selectedOrder.id === id) {
             const updated = orders.find(o => o.id === id)
             if (updated) setSelectedOrder({...updated, status, carrier, tracking_number: trackingNumber})
        }
      } else {
        alert(t('dash.error_update_order') + ': ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdatingOrder(null)
    }
  }

  const normalizeStatus = (s: string) => s.toLowerCase()
  
  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || normalizeStatus(order.status) === filter
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch(normalizeStatus(status)) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
      case 'paid': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'
      case 'shipped': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10'
      case 'delivered': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
      case 'cancelled': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10'
      default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'
    }
  }

  const getStatusDot = (status: string) => {
     switch(normalizeStatus(status)) {
        case 'pending': return 'bg-yellow-500'
        case 'paid': return 'bg-blue-500'
        case 'shipped': return 'bg-purple-500'
        case 'delivered': return 'bg-green-500'
        case 'cancelled': return 'bg-red-500'
        default: return 'bg-gray-500'
     }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
  }

  const downloadInvoicePDF = (order: Order) => {
    const doc = new jsPDF()
    
    // -- Header --
    doc.setFillColor(20, 20, 20) // Dark header
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(t('invoice.title'), 20, 25)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${t('invoice.order_num')}${order.id.slice(0, 8).toUpperCase()}`, 190, 25, { align: 'right' })

    // -- Brand / Company Info (Placeholder) --
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('NOMADA STORE', 20, 55)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Calle 123 # 45 - 67', 20, 60)
    doc.text('Bogotá, Colombia', 20, 64)
    doc.text('NIT: 900.000.000-1', 20, 68)
    doc.text('info@nomadastore.com', 20, 72)

    // -- Customer Info --
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(t('invoice.customer_title'), 120, 55)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(order.customer_name, 120, 60)
    if (order.customer_email) doc.text(order.customer_email, 120, 64)
    doc.text(order.shipping_address, 120, 68)
    doc.text(order.shipping_address, 120, 68)
    doc.text(`${order.city} - Tel: ${order.phone}`, 120, 72)
    
    // Payment Info in Invoice
    if (order.payment_info?.payer?.identification) {
        doc.text(`${order.payment_info.payer.identification.type}: ${order.payment_info.payer.identification.number}`, 120, 76)
    }
    if (order.payment_info?.payment_method_id) {
        doc.text(`Método: ${order.payment_info.payment_method_id.toUpperCase()} - ${order.payment_info.payment_type_id?.replace('_', ' ')}`, 120, 80)
    }
    
    // -- Dates --
    doc.text(`${t('invoice.date')} ${new Date(order.created_at).toLocaleDateString('es-CO')}`, 20, 85)
    doc.text(`${t('invoice.status')} ${t(`dash.${order.status}`).toUpperCase()}`, 120, 85)

    // -- Table --
    const tableColumn = [t('dash.table_product'), t('dash.table_qty'), t('dash.table_price'), t('dash.table_total')]
    const tableRows: any[] = []

    order.order_items.forEach(item => {
        const itemData = [
            item.products?.name || 'Producto',
            item.quantity,
            formatCurrency(item.price_at_time),
            formatCurrency(item.price_at_time * item.quantity)
        ]
        tableRows.push(itemData)
    })

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    })

    // -- Totals --
    const finalY = (doc as any).lastAutoTable.finalY + 10
    
    doc.setFontSize(10)
    doc.text(`${t('checkout.subtotal')}:`, 140, finalY)
    doc.text(formatCurrency(order.total), 190, finalY, { align: 'right' })
    
    doc.text(`${t('checkout.shipping_cost')}:`, 140, finalY + 6)
    doc.setTextColor(34, 197, 94) // Green
    doc.text(t('dash.included'), 190, finalY + 6, { align: 'right' })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${t('checkout.total')}:`, 140, finalY + 14)
    doc.text(formatCurrency(order.total), 190, finalY + 14, { align: 'right' })

    // -- Footer --
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(t('invoice.thanks'), 105, 280, { align: 'center' })
    doc.text(t('invoice.generated'), 105, 285, { align: 'center' })

    doc.save(`Factura_Nomada_${order.id.slice(0, 8)}.pdf`)
  }

  return (
    <div className="space-y-8 relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-border/60">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">{t('dash.orders_management')}</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/50"></span>
            {t('dash.orders_desc')}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-2xl border border-border shadow-sm">
           <Package className="w-8 h-8 text-primary/80" />
           <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('dash.total_orders')}</span>
              <span className="text-2xl font-black text-foreground leading-none">{orders.length}</span>
           </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'all', icon: Filter, label: t('dash.all'), color: 'bg-muted/50 text-muted-foreground ring-1 ring-inset ring-gray-500/10' },
            { id: 'pending', icon: Clock, label: t('dash.pending'), color: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' },
            { id: 'paid', icon: CreditCard, label: t('dash.paid'), color: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10' },
            { id: 'shipped', icon: Truck, label: t('dash.shipped'), color: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10' },
            { id: 'delivered', icon: CheckCircle, label: t('dash.delivered'), color: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' },
            { id: 'cancelled', icon: X, label: t('dash.cancelled'), color: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10' },
          ].map((item) => {
            const Icon = item.icon
            const isActive = filter === item.id
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                  isActive 
                    ? `${item.color} shadow-md ring-1 ring-inset ring-black/5` 
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                {item.label}
              </button>
            )
          })}
        </div>
        
        <div className="relative w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dash.search_orders')} 
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Modern Table Layout (Desktop) */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card border border-dashed border-border rounded-3xl text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
             <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('dash.no_orders')}</h3>
          <p className="text-muted-foreground">{t('dash.no_orders_search')}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">#{t('dash.order_id')}</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">{t('dash.customer_label')}</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">{t('dash.date_label')}</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">{t('checkout.total')}</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">{t('dash.status')}</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-right">{t('dash.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/10 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded text-foreground/80">
                                        {order.id.slice(0, 8)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                            {order.customer_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{order.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{order.city || t('dash.na')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">
                                            {new Date(order.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(order.created_at).getFullYear()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-foreground">
                                        {formatCurrency(order.total)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(order.status)} animate-pulse`}></span>
                                        {t(`dash.${order.status}`)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Status Actions */}
                                            {order.status === 'pending' && (
                                                <ActionTooltip text={t('dash.mark_paid')}>
                                                    <button 
                                                        onClick={() => initiateUpdate(order.id, 'paid')}
                                                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors bg-blue-50"
                                                    >
                                                        <CreditCard className="w-4 h-4" />
                                                    </button>
                                                </ActionTooltip>
                                            )}
                                            {order.status === 'paid' && (
                                                <ActionTooltip text={t('dash.ship_order')}>
                                                    <button 
                                                        onClick={() => initiateUpdate(order.id, 'shipped')}
                                                        className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors bg-purple-50"
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                    </button>
                                                </ActionTooltip>
                                            )}
                                            {order.status === 'shipped' && (
                                                <ActionTooltip text={t('dash.mark_delivered')}>
                                                    <button 
                                                        onClick={() => initiateUpdate(order.id, 'delivered')}
                                                        className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors bg-green-50"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                </ActionTooltip>
                                            )}
                                        
                                        <div className="w-px h-6 bg-border mx-2"></div>

                                        <button 
                                            onClick={() => setSelectedOrder(order)}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {t('products.details')}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
                <div className="flex flex-col">
                    {filteredOrders.map((order) => (
                        <div key={order.id} className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors">
                            {/* Header: ID & Status */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded text-foreground/80">
                                        #{order.id.slice(0, 8)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusColor(order.status)}`}>
                                    <span className={`w-1 h-1 rounded-full ${getStatusDot(order.status)} animate-pulse`}></span>
                                    {t(`dash.${order.status}`)}
                                </span>
                            </div>
                            
                            {/* Main Info */}
                            <div className="flex items-center gap-3 mb-3">
                                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {order.customer_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground text-sm">{order.customer_name}</h4>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {order.city || t('dash.na')}
                                    </p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="font-black text-foreground">{formatCurrency(order.total)}</p>
                                    <p className="text-[10px] text-muted-foreground">{order.order_items.length} {t('dash.items') || 'items'}</p>
                                </div>
                            </div>
                            
                            {/* Actions Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/30 mt-2">
                                <div className="flex gap-2">
                                     {/* Status Actions (Compact) */}
                                     {order.status === 'pending' && (
                                        <button 
                                            onClick={() => initiateUpdate(order.id, 'paid')}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                        </button>
                                    )}
                                    {order.status === 'paid' && (
                                        <button 
                                            onClick={() => initiateUpdate(order.id, 'shipped')}
                                            className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"
                                        >
                                            <Truck className="w-4 h-4" />
                                        </button>
                                    )}
                                    {order.status === 'shipped' && (
                                        <button 
                                            onClick={() => initiateUpdate(order.id, 'delivered')}
                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setSelectedOrder(order)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-md shadow-primary/20"
                                >
                                    <Eye className="w-3 h-3" />
                                    {t('products.details')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                <motion.div 
                    initial={{ opacity: 0, y: 50 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-card w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-border"
                >
                    {/* Modal Header */}
                    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">{t('dash.invoice')}</h2>
                                    <p className="text-sm text-muted-foreground font-mono">#{selectedOrder.id.slice(0, 12).toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize ${getStatusColor(selectedOrder.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(selectedOrder.status)} animate-pulse`}></span>
                                    {t(`dash.${selectedOrder.status}`)}
                                </span>
                                <button 
                                    onClick={() => downloadInvoicePDF(selectedOrder)}
                                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    {t('dash.download_pdf')} 
                                </button>
                                <button 
                                    onClick={() => setSelectedOrder(null)} 
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* Order Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Order Date Card */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">{t('dash.date_label')}</h3>
                                </div>
                                <p className="font-bold text-lg text-foreground">
                                    {new Date(selectedOrder.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(selectedOrder.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            {/* Customer Card */}
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-2xl p-5 border border-purple-200/50 dark:border-purple-800/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">{t('dash.customer')}</h3>
                                </div>
                                <p className="font-bold text-lg text-foreground mb-2">{selectedOrder.customer_name}</p>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> {selectedOrder.customer_email || t('dash.no_email')}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> {selectedOrder.phone}
                                    </p>
                                </div>
                            </div>

                            {/* Shipping Card */}
                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-2xl p-5 border border-green-200/50 dark:border-green-800/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300">{t('checkout.shipping')}</h3>
                                </div>
                                <p className="font-bold text-foreground mb-1">{selectedOrder.city}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{selectedOrder.shipping_address}</p>
                                <p className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 font-bold mt-2">
                                    {t('dash.included_badge')}
                                </p>
                                {(selectedOrder.carrier || selectedOrder.tracking_number) && (
                                    <div className="mt-4 pt-3 border-t border-green-200/50 dark:border-green-800/50">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('dash.tracking_label')}</p>
                                        {selectedOrder.carrier && <p className="text-xs font-medium text-foreground">{selectedOrder.carrier}</p>}
                                        {selectedOrder.tracking_number && <p className="text-xs font-mono text-muted-foreground bg-white/50 dark:bg-black/20 p-1 rounded inline-block mt-1">{selectedOrder.tracking_number}</p>}
                                    </div>
                                )}
                                </div>

                            {/* Payment Info Card (New) */}
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-2xl p-5 border border-indigo-200/50 dark:border-indigo-800/50 col-span-1 md:col-span-3 lg:col-span-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">{t('dash.payment_details')}</h3>
                                </div>
                                
                                {selectedOrder.payment_info ? (
                                    <div className="space-y-2">
                                         {selectedOrder.payment_info.payment_method_id && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{t('dash.method')}:</span>
                                                <span className="font-bold uppercase text-foreground">{selectedOrder.payment_info.payment_method_id}</span>
                                            </div>
                                         )}
                                         {selectedOrder.payment_info.payment_type_id && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{t('dash.payment_type')}:</span>
                                                <span className="font-medium capitalize text-foreground">{selectedOrder.payment_info.payment_type_id.replace(/_/g, ' ')}</span>
                                            </div>
                                         )}
                                          {selectedOrder.payment_info.payer?.identification && (
                                            <div className="flex justify-between items-center text-sm border-t border-indigo-200/30 pt-2 mt-2">
                                                <span className="text-muted-foreground">{selectedOrder.payment_info.payer.identification.type}:</span>
                                                <span className="font-bold font-mono text-foreground">{selectedOrder.payment_info.payer.identification.number}</span>
                                            </div>
                                         )}
                                         {selectedOrder.payment_info.date_approved && (
                                            <div className="text-[10px] text-muted-foreground pt-2 text-right">
                                               {t('dash.approved_at')}: {new Date(selectedOrder.payment_info.date_approved).toLocaleString('es-CO')}
                                            </div>
                                         )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">{t('dash.no_payment_details')}</p>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" /> 
                                    {t('cart.items')}
                                </h3>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {selectedOrder.order_items?.length || 0} {selectedOrder.order_items?.length === 1 ? t('dash.item_one') : t('dash.item_many')}
                                </span>
                            </div>
                            
                            <div className="border rounded-2xl overflow-hidden border-border/50">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50">
                                        <tr className="border-b border-border/50">
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">{t('dash.table_product')}</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">{t('dash.table_qty')}</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">{t('dash.table_price')}</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">{t('dash.table_total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {selectedOrder.order_items?.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-muted rounded-xl relative overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                                                            {(() => {
                                                                const img = item.products?.image_url || item.products?.images?.[0]
                                                                return img ? (
                                                                    <Image 
                                                                        src={img} 
                                                                        alt={item.products?.name || t('dash.product')} 
                                                                        fill  
                                                                        className="object-cover" 
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground font-bold">{t('dash.image_abbr')}</div>
                                                                )
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground mb-1">{item.products?.name || t('dash.product')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted font-bold text-foreground">
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-muted-foreground">{formatCurrency(item.price_at_time)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-lg text-foreground">
                                                    {formatCurrency(item.price_at_time * item.quantity)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="flex justify-end">
                            <div className="w-full md:w-96 bg-gradient-to-br from-muted/50 to-muted/30 p-6 rounded-2xl border-2 border-border/50 shadow-lg">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">{t('dash.summary_title')}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">{t('checkout.subtotal')}</span>
                                        <span className="font-semibold text-foreground">{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">{t('dash.shipping_label')}</span>
                                        <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-bold">
                                            <CheckCircle className="w-3 h-3" />
                                            {t('dash.included')}
                                        </span>
                                    </div>
                                    <div className="h-px bg-border my-3"></div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-bold text-xl">{t('dash.total_label')}</span>
                                        <span className="font-black text-2xl text-primary">{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-border text-center"
                >
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t('dash.confirm_status_title')}</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            {t('dash.confirm_status_desc').replace('{status}', t(`dash.${confirmData.status}`))}
                        </p>
                        
                        {confirmData.status === 'shipped' && (
                            <div className="w-full space-y-3 mb-6">
                                <input 
                                    type="text" 
                                    placeholder={t('dash.carrier_placeholder')}
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <input 
                                    type="text" 
                                    placeholder={t('dash.tracking_placeholder')}
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setConfirmData(null)}
                                className="flex-1 py-3 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors"
                            >
                                {t('dash.cancel')}
                            </button>
                            <button 
                                onClick={performUpdate}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                            >
                                {t('dash.confirm_btn')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  )
}
