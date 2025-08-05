import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toastService } from '@/lib/toast-service';

interface EventData {
  id: string;
  name: string;
  sport: string;
  status: string;
  program_url: string;
  viewer_count?: number;
  event_code: string;
  youtube_key?: string;
  twitch_key?: string;
}

interface Camera {
  id: string;
  device_label: string;
  is_live: boolean;
  is_active: boolean;
  event_id: string;
}

interface UseRealtimeEventUpdatesProps {
  eventId: string;
  onEventUpdate?: (event: EventData) => void;
  onCameraUpdate?: (cameras: Camera[]) => void;
  onCameraSwitch?: (cameraLabel: string) => void;
}

export const useRealtimeEventUpdates = ({
  eventId,
  onEventUpdate,
  onCameraUpdate,
  onCameraSwitch
}: UseRealtimeEventUpdatesProps) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEventData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      setEvent(data);
      onEventUpdate?.(data);
    } catch (error) {
      console.error('Error loading event:', error);
    }
  }, [eventId, onEventUpdate]);

  const loadCameras = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at');

      if (error) throw error;
      
      setCameras(data || []);
      onCameraUpdate?.(data || []);
    } catch (error) {
      console.error('Error loading cameras:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, onCameraUpdate]);

  useEffect(() => {
    if (!eventId) return;

    // Load initial data
    loadEventData();
    loadCameras();

    // Subscribe to event updates
    const eventChannel = supabase
      .channel('event_updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const updatedEvent = payload.new as EventData;
          setEvent(updatedEvent);
          onEventUpdate?.(updatedEvent);
          
          // Show toast for status changes
          if (payload.old.status !== updatedEvent.status) {
            if (updatedEvent.status === 'live') {
              toastService.event.streamStarted();
            } else if (updatedEvent.status === 'ended') {
              toastService.event.streamEnded();
            }
          }
        }
      )
      .subscribe();

    // Subscribe to camera updates
    const cameraChannel = supabase
      .channel('camera_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cameras', filter: `event_id=eq.${eventId}` },
        () => {
          loadCameras();
        }
      )
      .subscribe();

    // Subscribe to camera switches
    const switchChannel = supabase
      .channel('camera_switches')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'switch_logs', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          // Get camera info for the switch
          const { data: camera } = await supabase
            .from('cameras')
            .select('device_label')
            .eq('id', payload.new.camera_id)
            .single();
            
          if (camera) {
            onCameraSwitch?.(camera.device_label);
            toastService.event.cameraSwitched(camera.device_label);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(cameraChannel);
      supabase.removeChannel(switchChannel);
    };
  }, [eventId, loadEventData, loadCameras, onEventUpdate, onCameraUpdate, onCameraSwitch]);

  return {
    event,
    cameras,
    loading,
    refetch: {
      event: loadEventData,
      cameras: loadCameras
    }
  };
};