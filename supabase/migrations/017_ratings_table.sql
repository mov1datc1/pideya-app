-- =============================================
-- Tabla de calificaciones (requerida por la app movil)
-- Aplicar manualmente en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  food_rating INTEGER NOT NULL CHECK (food_rating >= 1 AND food_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_one_per_order UNIQUE (order_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- El usuario puede crear su propia calificacion
CREATE POLICY "ratings_insert_own" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cualquiera puede leer calificaciones
CREATE POLICY "ratings_select_public" ON public.ratings
  FOR SELECT USING (true);

-- El restaurante puede leer sus calificaciones
CREATE POLICY "ratings_select_restaurant" ON public.ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = ratings.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_ratings_restaurant ON public.ratings(restaurant_id, created_at DESC);
CREATE INDEX idx_ratings_order ON public.ratings(order_id);
CREATE INDEX idx_ratings_user ON public.ratings(user_id);
