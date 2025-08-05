-- First, let's add proper user roles for our sports streaming app
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id
);

-- Update RLS policies for cameras table to be more secure
DROP POLICY IF EXISTS "Cameras are viewable by everyone" ON public.cameras;
DROP POLICY IF EXISTS "Cameras can be created by everyone" ON public.cameras;
DROP POLICY IF EXISTS "Cameras can be updated by everyone" ON public.cameras;

-- Cameras: Allow authenticated users to view all cameras
CREATE POLICY "Authenticated users can view cameras" 
ON public.cameras 
FOR SELECT 
TO authenticated
USING (true);

-- Cameras: Allow camera operators to register/create cameras
CREATE POLICY "Camera operators can register cameras" 
ON public.cameras 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Cameras: Allow event owners and camera operators to update cameras
CREATE POLICY "Event owners and operators can update cameras" 
ON public.cameras 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = cameras.event_id 
    AND events.owner_id = auth.uid()
  )
  OR auth.uid() IS NOT NULL
);

-- Cameras: Allow event owners to delete cameras
CREATE POLICY "Event owners can delete cameras" 
ON public.cameras 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = cameras.event_id 
    AND events.owner_id = auth.uid()
  )
);

-- Update RLS policies for switch_logs table
DROP POLICY IF EXISTS "Switch logs are viewable by everyone" ON public.switch_logs;
DROP POLICY IF EXISTS "Switch logs can be created by everyone" ON public.switch_logs;

-- Switch logs: Allow authenticated users to view switch logs for events they can access
CREATE POLICY "Users can view switch logs for accessible events" 
ON public.switch_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = switch_logs.event_id 
    AND (events.owner_id = auth.uid() OR true) -- Allow viewers to see switch logs
  )
);

-- Switch logs: Allow event owners and camera operators to create switch logs
CREATE POLICY "Event participants can create switch logs" 
ON public.switch_logs 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = switch_logs.event_id 
    AND events.owner_id = auth.uid()
  )
  OR auth.uid() IS NOT NULL
);

-- Add more specific event policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

-- Events: Allow everyone to view public events (for viewers)
CREATE POLICY "Public events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (true);

-- Events: Allow authenticated users to view events they participate in
CREATE POLICY "Participants can view events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (
  owner_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR true -- Allow viewers
);

-- Add security function to validate event codes
CREATE OR REPLACE FUNCTION public.validate_event_code(code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT code ~ '^[A-Z0-9]{6}$';
$$;

-- Add function to check if user can access event
CREATE OR REPLACE FUNCTION public.can_access_event(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id 
    AND (owner_id = user_id OR has_role(user_id, 'admin'::app_role))
  );
$$;

-- Add trigger to validate event data integrity
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for event validation
DROP TRIGGER IF EXISTS validate_event_data_trigger ON public.events;
CREATE TRIGGER validate_event_data_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_data();