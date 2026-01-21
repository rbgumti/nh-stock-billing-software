-- Make payment-receipts bucket private to prevent public access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-receipts';

-- Add constraint to validate stock item names to prevent special characters
-- that could cause issues in JSONB keys
ALTER TABLE public.stock_items 
ADD CONSTRAINT valid_stock_item_name 
CHECK (name ~ '^[a-zA-Z0-9 \-\.\(\)&/,]+$' AND length(name) <= 200);

-- Fix search_path for existing functions that don't have it set
CREATE OR REPLACE FUNCTION public.validate_stock_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  item text;
  obj jsonb;
  opening numeric;
  sold numeric;
  closing numeric;
BEGIN
  IF NEW.stock_snapshot IS NULL THEN
    RETURN NEW;
  END IF;
  FOR item, obj IN SELECT key, value FROM jsonb_each(NEW.stock_snapshot)
  LOOP
    opening := (obj ->> 'opening')::numeric;
    sold := (obj ->> 'sold')::numeric;
    closing := (obj ->> 'closing')::numeric;
    IF opening - sold <> closing THEN
      RAISE EXCEPTION 'Stock validation failed for "%": opening (% ) - sold (%) != closing (%)', item, opening, sold, closing;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_leaked_password_rejection(
  p_user_id uuid, 
  p_email text, 
  p_ip inet, 
  p_user_agent text, 
  p_reason text, 
  p_raw_payload jsonb, 
  p_actor text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.leaked_password_rejections(
    user_id, email, ip, user_agent, reason, raw_payload, created_by
  ) VALUES (
    p_user_id, p_email, p_ip, p_user_agent, p_reason, p_raw_payload, COALESCE(p_actor, current_setting('app.current_actor', true))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_day_report_closing_for_item(target_date date, item_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.day_reports dr
  SET stock_snapshot = (
    SELECT jsonb_object_agg(key, value)
    FROM (
      SELECT t.key,
             (
               t.value || jsonb_build_object('closing', to_jsonb(
                 GREATEST(
                   COALESCE((t.value->>'opening')::int, si.current_stock, 0) - COALESCE((t.value->>'sold')::int, 0),
                   0
                 )
               ))
             ) AS value
      FROM jsonb_each(dr.stock_snapshot) AS t(key, value)
      LEFT JOIN public.stock_items si ON si.name = t.key
    ) s
  )
  WHERE dr.report_date = target_date
    AND dr.stock_snapshot ? item_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invoice_items_sync_day_reports_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  inv_date text;
  d date;
  name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    inv_date := OLD.created_at::text;
    name := OLD.medicine_name;
  ELSE
    inv_date := COALESCE(NEW.created_at::text, NEW.invoice_id::text);
    name := NEW.medicine_name;
  END IF;

  BEGIN
    SELECT invoice_date INTO inv_date FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id) LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    d := inv_date::date;
  EXCEPTION WHEN OTHERS THEN
    d := current_date;
  END;

  PERFORM public.recompute_day_report_closing_for_item(d, name);

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.patients_broadcast_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM realtime.broadcast_changes(
    'patient:' || COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN NULL;
END;
$function$;