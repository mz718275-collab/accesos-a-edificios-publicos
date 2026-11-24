-- Esquema SQL para Supabase (PostgreSQL)
-- Ejecutá este script en el SQL Editor de tu proyecto en Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.entradas_accesibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_punto text NOT NULL CHECK (char_length(trim(nombre_punto)) > 0),
  edificio text NOT NULL CHECK (char_length(trim(edificio)) > 0),
  calle_acceso text NOT NULL CHECK (char_length(trim(calle_acceso)) > 0),
  tipo_entrada text NOT NULL CHECK (tipo_entrada IN ('con rampa', 'con escalones')),
  latitud double precision NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
  longitud double precision NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para filtrar rápidamente por tipo de entrada
CREATE INDEX IF NOT EXISTS idx_entradas_tipo
  ON public.entradas_accesibilidad (tipo_entrada);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at_entradas()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entradas_updated_at ON public.entradas_accesibilidad;
CREATE TRIGGER trg_entradas_updated_at
  BEFORE UPDATE ON public.entradas_accesibilidad
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_entradas();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.entradas_accesibilidad ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso desde la aplicación web (lectura y gestión pública o vía Service Role)
DROP POLICY IF EXISTS "Permitir lectura publica de entradas" ON public.entradas_accesibilidad;
CREATE POLICY "Permitir lectura publica de entradas"
  ON public.entradas_accesibilidad
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insertar entradas" ON public.entradas_accesibilidad;
CREATE POLICY "Permitir insertar entradas"
  ON public.entradas_accesibilidad
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir editar entradas" ON public.entradas_accesibilidad;
CREATE POLICY "Permitir editar entradas"
  ON public.entradas_accesibilidad
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminar entradas" ON public.entradas_accesibilidad;
CREATE POLICY "Permitir eliminar entradas"
  ON public.entradas_accesibilidad
  FOR DELETE
  USING (true);

-- Tres ejemplos iniciales en ubicaciones distintas
INSERT INTO public.entradas_accesibilidad (nombre_punto, edificio, calle_acceso, tipo_entrada, latitud, longitud)
SELECT * FROM (
  VALUES
    ('Acceso Lateral — Rampa Pasaje', 'Teatro Colón', 'Tucumán 1171 (Calle lateral)', 'con rampa', -34.600920::double precision, -58.383150::double precision),
    ('Entrada Principal — Escalinata', 'Palacio Barolo', 'Av. de Mayo 1370', 'con escalones', -34.609580::double precision, -58.385820::double precision),
    ('Ingreso Accesible — Rampa Oeste', 'Biblioteca Nacional Mariano Moreno', 'Agüero 2502 (Acceso lateral)', 'con rampa', -34.584420::double precision, -58.398210::double precision)
) AS seed(nombre_punto, edificio, calle_acceso, tipo_entrada, latitud, longitud)
WHERE NOT EXISTS (SELECT 1 FROM public.entradas_accesibilidad LIMIT 1);
