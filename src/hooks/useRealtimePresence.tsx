import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceUser {
  user_id: string;
  online_at: string;
  user_agent?: string;
}

interface UseRealtimePresenceProps {
  eventId: string;
  userId?: string;
}

export const useRealtimePresence = ({ eventId, userId }: UseRealtimePresenceProps) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceUser[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const handlePresenceSync = useCallback(() => {
    if (!channel) return;
    
    const newState = channel.presenceState() as Record<string, PresenceUser[]>;
    setPresenceState(newState);
    
    // Flatten the presence state to get all online users
    const users = Object.values(newState).flat().filter((user): user is PresenceUser => 
      user && typeof user === 'object' && 'user_id' in user && 'online_at' in user
    );
    setOnlineUsers(users);
  }, [channel]);

  const handlePresenceJoin = useCallback(({ key, newPresences }) => {
    console.log('User joined:', key, newPresences);
  }, []);

  const handlePresenceLeave = useCallback(({ key, leftPresences }) => {
    console.log('User left:', key, leftPresences);
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const presenceChannel = supabase.channel(`event_${eventId}`, {
      config: {
        presence: {
          key: userId || 'anonymous'
        }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .on('presence', { event: 'join' }, handlePresenceJoin)
      .on('presence', { event: 'leave' }, handlePresenceLeave)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          const userStatus = {
            user_id: userId,
            online_at: new Date().toISOString(),
            user_agent: navigator.userAgent.slice(0, 100)
          };
          
          await presenceChannel.track(userStatus);
        }
      });

    setChannel(presenceChannel);

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [eventId, userId, handlePresenceSync, handlePresenceJoin, handlePresenceLeave]);

  const updatePresence = useCallback(async (data: Partial<PresenceUser>) => {
    if (channel && userId) {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...data
      });
    }
  }, [channel, userId]);

  const viewerCount = useMemo(() => onlineUsers.length, [onlineUsers.length]);

  return {
    onlineUsers,
    presenceState,
    viewerCount,
    updatePresence
  };
};