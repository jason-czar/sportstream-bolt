-- Add Telegram integration fields to events table
ALTER TABLE public.events 
ADD COLUMN telegram_channel_id text,
ADD COLUMN telegram_invite_link text;