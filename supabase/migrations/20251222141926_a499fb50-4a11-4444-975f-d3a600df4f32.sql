CREATE OR REPLACE FUNCTION public.snapshot_opening_at_1am_ist()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ist_now timestamptz := (now() AT TIME ZONE 'UTC') + interval '5 hours 30 minutes';
  report_d date := (ist_now::date);
  si record;
  snapshot jsonb;
BEGIN
  INSERT INTO public.day_reports(report_date, stock_snapshot)
  VALUES (report_d, '{}'::jsonb)
  ON CONFLICT (report_date) DO NOTHING;

  FOR si IN SELECT item_id, name, current_stock FROM public.stock_items LOOP
    SELECT stock_snapshot INTO snapshot FROM public.day_reports WHERE report_date = report_d FOR UPDATE;

    IF snapshot IS NULL THEN
      snapshot := '{}'::jsonb;
    END IF;

    snapshot := jsonb_set(
      snapshot,
      ARRAY[si.name],
      COALESCE(
        (snapshot -> si.name) || jsonb_build_object('opening', to_jsonb(COALESCE(si.current_stock, 0))),
        jsonb_build_object('opening', to_jsonb(COALESCE(si.current_stock, 0)))
      ),
      true
    );

    IF NOT ((snapshot -> si.name) ? 'sold') THEN
      snapshot := jsonb_set(snapshot, ARRAY[si.name], (snapshot -> si.name) || jsonb_build_object('sold', to_jsonb(0)), true);
    END IF;

    snapshot := (
      SELECT jsonb_object_agg(key, value) FROM (
        SELECT t.key,
               (t.value || jsonb_build_object('closing', to_jsonb(
                 GREATEST(
                   COALESCE((t.value->>'opening')::int, 0) - COALESCE((t.value->>'sold')::int, 0),
                   0
                 )
               ))) AS value
        FROM jsonb_each(snapshot) AS t(key, value)
      ) s
    );

    UPDATE public.day_reports SET stock_snapshot = snapshot WHERE report_date = report_d;
  END LOOP;
END;
$function$;