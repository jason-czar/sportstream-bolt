-- Add streaming_type column to events table
ALTER TABLE public.events 
ADD COLUMN streaming_type text CHECK (streaming_type IN ('mobile', 'telegram'));