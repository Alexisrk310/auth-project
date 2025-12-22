'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 1. Check active session immediately
    const initSession = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {

             const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()

             if (error) console.error('Error fetching role:', error)
             else console.log('Role fetched:', data?.role)
             
             const normalizedRole = data?.role?.toLowerCase() || 'user'
             setRole(normalizedRole)
        }
        setLoading(false)
    }
    initSession()

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
            
            if (error) console.error('Error updating role:', error)
            
            const normalizedRole = data?.role?.toLowerCase() || 'user'
            setRole(normalizedRole)
        } else {
            setRole(null)
        }

        setLoading(false)
        if (_event === 'SIGNED_IN') {
             router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return {
    user,
    role,
    session,
    loading,
    signOut,
  }
}
