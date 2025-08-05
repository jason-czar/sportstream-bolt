-- Update the validate_event_data function to remove future time validation
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate event code format
  IF NOT validate_event_code(NEW.event_code) THEN
    RAISE EXCEPTION 'Event code must be 6 characters long and contain only uppercase letters and numbers';
  END IF;
  
  -- Validate expected duration is positive
  IF NEW.expected_duration IS NOT NULL AND NEW.expected_duration <= 0 THEN
    RAISE EXCEPTION 'Expected duration must be positive';
  END IF;
  
  RETURN NEW;
END;
$function$;