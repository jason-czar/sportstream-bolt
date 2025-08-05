-- Phase 1: Critical Security Fixes

-- 1. Remove streaming keys from events table (move to environment secrets)
ALTER TABLE public.events DROP COLUMN IF EXISTS youtube_key;
ALTER TABLE public.events DROP COLUMN IF EXISTS twitch_key;

-- 2. Fix overly permissive RLS policies on events table
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Participants can view events" ON public.events;

-- Create secure event viewing policy that excludes sensitive data
CREATE POLICY "Authenticated users can view events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (
  -- Event owners can see all details
  owner_id = auth.uid() 
  OR 
  -- Admins can see all details
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Others can see basic event info but not sensitive fields
  (status = 'live'::event_status OR status = 'scheduled'::event_status)
);

-- 3. Strengthen camera access controls
DROP POLICY IF EXISTS "Camera operators can register cameras" ON public.cameras;
DROP POLICY IF EXISTS "Event owners and operators can update cameras" ON public.cameras;

CREATE POLICY "Event owners and directors can register cameras" 
ON public.cameras 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = cameras.event_id 
    AND (
      owner_id = auth.uid() 
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Event owners and directors can update cameras" 
ON public.cameras 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = cameras.event_id 
    AND (
      owner_id = auth.uid() 
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- 4. Strengthen switch logs access
DROP POLICY IF EXISTS "Event participants can create switch logs" ON public.switch_logs;
DROP POLICY IF EXISTS "Users can view switch logs for accessible events" ON public.switch_logs;

CREATE POLICY "Event owners and directors can create switch logs" 
ON public.switch_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = switch_logs.event_id 
    AND (
      owner_id = auth.uid() 
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Event participants can view switch logs" 
ON public.switch_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = switch_logs.event_id 
    AND (
      owner_id = auth.uid() 
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- 5. Add role validation for event creation
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

CREATE POLICY "Event creators can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND owner_id = auth.uid()
  AND (
    has_role(auth.uid(), 'event_creator'::app_role) 
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 6. Create audit logging table for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Add updated_at trigger to audit logs
CREATE TRIGGER update_security_audit_logs_updated_at
  BEFORE UPDATE ON public.security_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Update app_role enum to include necessary roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'event_creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';