# 🔧 Solución: Agregar Política de INSERT para Order Items

## ❌ Problema Encontrado

La tabla `order_items` tiene **Row Level Security (RLS)** habilitado pero **solo tiene política de SELECT**, no de INSERT. Esto significa que aunque el código esté correcto, la base de datos **rechaza** cualquier intento de insertar datos.

## ✅ Solución

Debes ejecutar esta migración SQL en tu base de datos Supabase:

### Opción 1: Desde el Panel de Supabase (MÁS FÁCIL)

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Haz clic en **SQL Editor** en el menú lateral
3. Copia y pega este código:

```sql
-- Add INSERT policy for order_items
drop policy if exists "Users can insert own order items" on public.order_items;

create policy "Users can insert own order items" 
on public.order_items 
for insert 
with check (
  exists (
    select 1 
    from public.orders 
    where id = order_items.order_id 
    and user_id = auth.uid()
  )
);
```

4. Haz clic en **Run** o presiona `Ctrl + Enter`
5. ✅ Deberías ver "Success. No rows returned"

### Opción 2: Usando Supabase CLI

Si tienes el CLI instalado:

```bash
# El archivo ya está creado en:
# supabase/migrations/add_order_items_insert_policy.sql

# Ejecuta la migración:
npx supabase db push
```

## 🧪 Cómo Probar

Después de aplicar la migración:

1. Ve a tu tienda y agrega productos al carrito
2. Completa el proceso de checkout
3. Ve a `/dashboard/orders`
4. Haz clic en "Ver detalles" de una orden
5. **Ahora la tabla de productos debería mostrar datos** ✅

## 📝 Explicación Técnica

**Antes:**
- ✅ Política SELECT: Los usuarios pueden VER order_items de sus propias órdenes
- ❌ Sin política INSERT: Los usuarios NO pueden crear order_items

**Después:**
- ✅ Política SELECT: Los usuarios pueden VER order_items 
- ✅ Política INSERT: Los usuarios pueden INSERTAR order_items **solo para sus propias órdenes**

La política verifica que el `order_id` del item pertenezca a una orden donde el `user_id` coincida con el usuario autenticado actual.

## 🔍 Verificación

Para confirmar que la política se aplicó correctamente, ejecuta en SQL Editor:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'order_items';
```

Deberías ver 2 políticas:
- `Users can view own order items` (SELECT)
- `Users can insert own order items` (INSERT) ← Nueva
