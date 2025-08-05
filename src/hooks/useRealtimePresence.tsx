import { useState, useEffect } from 'react';
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
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState() as Record<string, PresenceUser[]>;
        setPresenceState(newState);
        
        // Flatten the presence state to get all online users
        const users = Object.values(newState).flat().filter((user): user is PresenceUser => 
          user && typeof user === 'object' && 'user_id' in user && 'online_at' in user
        );
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
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
  }, [eventId, userId]);

  const updatePresence = async (data: Partial<PresenceUser>) => {
    if (channel && userId) {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...data
      });
    }
  };

  return {
    onlineUsers,
    presenceState,
    viewerCount: onlineUsers.length,
    updatePresence
  };
};