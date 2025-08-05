import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, Users, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TelegramStreamingProps {
  eventId: string;
  eventName: string;
  eventCode: string;
  telegramChannelId?: string;
  telegramInviteLink?: string;
  isDirector?: boolean;
}

const TelegramStreaming: React.FC<TelegramStreamingProps> = ({
  eventId,
  eventName,
  eventCode,
  telegramChannelId,
  telegramInviteLink,
  isDirector = false
}) => {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const startTelegramStream = async () => {
    if (!telegramChannelId) {
      toast({
        title: "Error",
        description: "Telegram channel not configured for this event",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('telegram-bot', {
        body: {
          action: 'startStream',
          channelId: telegramChannelId,
          eventName
        }
      });

      if (error) throw error;

      setIsLive(true);
      toast({
        title: "Live Stream Started",
        description: "Telegram live stream is now active!"
      });

      // Update event status to live
      await supabase
        .from('events')
        .update({ status: 'live' })
        .eq('id', eventId);

    } catch (error) {
      console.error('Error starting Telegram stream:', error);
      toast({
        title: "Error",
        description: "Failed to start Telegram live stream",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinTelegramChannel = () => {
    if (telegramInviteLink) {
      window.open(telegramInviteLink, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Telegram Live Stream
          </CardTitle>
          <CardDescription>
            Experience interactive live streaming through Telegram's infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Event Details</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Event:</strong> {eventName}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Code:</strong> {eventCode}
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm">
                  {isLive ? 'Live Now' : 'Not Live'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Telegram Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Live video streaming</li>
                <li>• Real-time chat interaction</li>
                <li>• Voice messages support</li>
                <li>• Screen sharing capabilities</li>
                <li>• Multi-device synchronization</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {isDirector && (
                <Button
                  onClick={startTelegramStream}
                  disabled={loading || isLive}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Starting...' : isLive ? 'Stream Active' : 'Start Live Stream'}
                </Button>
              )}
              
              <Button
                onClick={joinTelegramChannel}
                variant="outline"
                className="flex-1"
                disabled={!telegramInviteLink}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Telegram Channel
              </Button>
            </div>
          </div>

          {telegramInviteLink && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <h5 className="font-medium text-sm mb-2">How to Join:</h5>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Click "Join Telegram Channel" above</li>
                <li>2. Open the link in Telegram app or web</li>
                <li>3. Join the channel to participate in live chat</li>
                <li>4. Enjoy interactive live streaming experience!</li>
              </ol>
            </div>
          )}

          {!telegramInviteLink && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                Telegram channel is being set up. Please wait for the channel link to become available.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramStreaming;