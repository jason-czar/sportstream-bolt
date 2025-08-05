-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_duration INTEGER, -- in minutes
  event_code TEXT NOT NULL UNIQUE,
  mux_stream_id TEXT,
  program_url TEXT,
  youtube_key TEXT,
  twitch_key TEXT,
  status TEXT NOT NULL DEFAULT 'created', -- created, live, ended
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cameras table
CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false, -- currently selected for program feed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create switch_logs table
CREATE TABLE public.switch_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.switch_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for MVP - no auth required)
CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Events can be created by everyone" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Events can be updated by everyone" 
ON public.events 
FOR UPDATE 
USING (true);

CREATE POLICY "Cameras are viewable by everyone" 
ON public.cameras 
FOR SELECT 
USING (true);

CREATE POLICY "Cameras can be created by everyone" 
ON public.cameras 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Cameras can be updated by everyone" 
ON public.cameras 
FOR UPDATE 
USING (true);

CREATE POLICY "Switch logs are viewable by everyone" 
ON public.switch_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Switch logs can be created by everyone" 
ON public.switch_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_events_event_code ON public.events(event_code);
CREATE INDEX idx_cameras_event_id ON public.cameras(event_id);
CREATE INDEX idx_cameras_is_live ON public.cameras(is_live);
CREATE INDEX idx_cameras_is_active ON public.cameras(is_active);
CREATE INDEX idx_switch_logs_event_id ON public.switch_logs(event_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cameras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.switch_logs;