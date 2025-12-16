import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'

export interface Product {
    id: string
    name: string
    description: string
    price: number
    image_url: string
    images?: string[]
    category?: string
    sale_price?: number
    is_new?: boolean
    stock?: number
    stock_by_size?: Record<string, number>
    compare_at_price?: number
    sizes?: string[]
}

interface CartItem extends Product {
    quantity: number
    size?: string
}

interface CartState {
    cartId: string | null
    items: CartItem[]
    isOpen: boolean
    isLoading: boolean
    coupon: { code: string, discount_value: number, discount_type: 'percentage' | 'fixed', applied_discount: number } | null
    addItem: (product: Product & { size?: string, quantity?: number }) => Promise<boolean>
    removeItem: (productId: string, size?: string) => Promise<void>
    updateQuantity: (productId: string, quantity: number, size?: string) => Promise<void>
    applyCoupon: (coupon: any) => void
    removeCoupon: () => void
    clearCart: () => Promise<void>
    toggleCart: () => void
    fetchCart: () => Promise<void>
    total: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            cartId: null,
            items: [],
            isOpen: false,
            isLoading: false,
            coupon: null,

            applyCoupon: (coupon) => set({ coupon }),
            removeCoupon: () => set({ coupon: null }),


            fetchCart: async () => {
                const { cartId } = get()
                if (!cartId) return

                set({ isLoading: true })
                try {
                    // Fetch items joined with products
                    const { data: cartItems, error } = await supabase
                        .from('cart_items')
                        .select(`
                            quantity,
                            size,
                            product:products (
                                id, name, description, price, sale_price, image_url, images, 
                                category, is_new, stock, stock_by_size, compare_at_price
                            )
                        `)
                        .eq('cart_id', cartId)

                    if (error) throw error

                    // Transform nested data to flat CartItem
                    const items: CartItem[] = cartItems.map((item: any) => {
                        const p = item.product
                        // Determine effective price directly from fresh DB data
                        const effectivePrice = p.sale_price || p.price
                        
                        return {
                            ...p,
                            price: effectivePrice, // ALWAYS use DB price
                            quantity: item.quantity,
                            size: item.size
                        }
                    })

                    set({ items })
                } catch (error: any) {
                    console.error('Error fetching cart:', error.message || error)
                    if (error.code) console.error('Error content:', error)
                } finally {
                    set({ isLoading: false })
                }
            },

            addItem: async (product) => {
                let { cartId } = get()
                const quantity = product.quantity || 1
                const size = product.size || 'M'

                try {
                    // 1. Check local state for instant stock validation
                    // (We assume get().items is relatively fresh due to Realtime)
                    const existingItem = get().items.find(i => i.id === product.id && i.size === size)
                    const currentQty = existingItem ? existingItem.quantity : 0
                    
                    const availableStock = product.stock_by_size 
                        ? (product.stock_by_size[size] || 0) 
                        : (product.stock || 0)

                    if (currentQty + quantity > availableStock) {
                        return false // Stock limit reached
                    }

                    // 2. Ensure Cart Exists
                    if (!cartId) {
                        const { data: newCart, error: cartError } = await supabase
                            .from('carts')
                            .insert({})
                            .select()
                            .single()
                        
                        if (cartError) throw cartError
                        cartId = newCart.id
                        set({ cartId }) // Persist ID
                    }

                    const newQuantity = currentQty + quantity

                    // 3. Upsert Item
                    const { error: itemError } = await supabase
                        .from('cart_items')
                        .upsert({
                            cart_id: cartId,
                            product_id: product.id,
                            size: size,
                            quantity: newQuantity
                        }, { onConflict: 'cart_id, product_id, size' })

                    if (itemError) throw itemError

                    set({ isOpen: true })
                    get().fetchCart()
                    return true

                } catch (error) {
                    console.error('Error adding item:', error)
                    return false
                }
            },

            removeItem: async (productId, size) => {
                const { cartId } = get()
                if (!cartId) return

                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('cart_id', cartId)
                    .eq('product_id', productId)
                    .eq('size', size || 'M') // Handle optional size
                
                get().fetchCart() // Refresh
            },

            updateQuantity: async (productId, quantity, size) => {
                const { cartId } = get()
                if (!cartId) return

                if (quantity <= 0) {
                    get().removeItem(productId, size)
                    return
                }

                await supabase
                    .from('cart_items')
                    .update({ quantity })
                    .eq('cart_id', cartId)
                    .eq('product_id', productId)
                    .eq('size', size || 'M')

                get().fetchCart()
            },

            clearCart: async () => {
                const { cartId } = get()
                if (cartId) {
                    await supabase.from('cart_items').delete().eq('cart_id', cartId)
                    set({ items: [] })
                }
            },

            toggleCart: () => set({ isOpen: !get().isOpen }),

            total: () => {
                return get().items.reduce(
                    (acc, item) => acc + item.price * item.quantity,
                    0
                )
            }
        }),
        {
            name: 'cart-storage-id', // Only persist the ID now!
            partialize: (state) => ({ cartId: state.cartId }), // Don't persist items, fetch them!
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.fetchCart()

                    // Subscribe to Realtime Changes
                    const channel = supabase.channel('cart-realtime')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `cart_id=eq.${state.cartId}` }, () => {
                            console.log('Realtime: Cart items changed!')
                            state.fetchCart()
                        })
                        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, () => {
                            console.log('Realtime: Product updated! Refreshing cart prices.')
                            state.fetchCart()
                        })
                        .subscribe()
                    
                    // Cleanup? Global store, keeps running.
                }
            }
        }
    )
)
