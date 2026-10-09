-- Aplicar una sola vez antes de publicar la interfaz de notas.
-- Cambio aditivo: conserva datos, importes, claves y políticas RLS existentes.
ALTER TABLE public.cecilia_sales ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.cecilia_debts ADD COLUMN IF NOT EXISTS notes text;
COMMENT ON COLUMN public.cecilia_sales.notes IS 'Notas opcionales de la venta';
COMMENT ON COLUMN public.cecilia_debts.notes IS 'Notas opcionales de la deuda';
-- Verificar que public.cecilia_pull_changes devuelva las columnas
-- nuevas en sales y debts; si construye JSON con campos explícitos,
-- adaptar la función antes del deploy.
