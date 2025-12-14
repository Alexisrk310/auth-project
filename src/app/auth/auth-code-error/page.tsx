'use client'

import React from 'react'
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Error de Autenticación</h1>
      <p className="mb-6 text-muted-foreground">
        Hubo un problema verificando tu código de inicio de sesión.
      </p>
      <Link 
        href="/login"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
      >
        Volver a Iniciar Sesión
      </Link>
    </div>
  )
}
