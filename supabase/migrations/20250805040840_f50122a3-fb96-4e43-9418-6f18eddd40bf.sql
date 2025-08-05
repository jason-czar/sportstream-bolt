-- Fix function search path security issues by setting proper search_path

-- Update validate_event_code function
CREATE OR REPLACE FUNCTION public.validate_event_code(code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT code ~ '^[A-Z0-9]{6}$';
$$;

-- Update can_access_event function  
CREATE OR REPLACE FUNCTION public.can_access_event(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id 
    AND (owner_id = user_id OR has_role(user_id, 'admin'::app_role))
  );
$$;

-- Update validate_event_data function
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate event code format
  IF NOT validate_event_code(NEW.event_code) THEN
    RAISE EXCEPTION 'Event code must be 6 characters long and contain only uppercase letters and numbers';
  END IF;
  
  -- Validate start time is in the future (for new events)
  IF TG_OP = 'INSERT' AND NEW.start_time <= now() THEN
    RAISE EXCEPTION 'Event start time must be in the future';
  END IF;
  
  -- Validate expected duration is positive
  IF NEW.expected_duration IS NOT NULL AND NEW.expected_duration <= 0 THEN
    RAISE EXCEPTION 'Expected duration must be positive';
  END IF;
  
  RETURN NEW;
END;
$$;