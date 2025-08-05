import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Play, Users, Wifi } from "lucide-react";
import Hls from "hls.js";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface EventData {
  id: string;
  name: string;
  sport: string;
  status: string;
  program_url: string;
}

const ViewerPage = () => {
  const { eventId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [viewerCount] = useState(Math.floor(Math.random() * 500) + 50); // Mock viewer count
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventData();
      subscribeToUpdates();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [eventId]);

  useEffect(() => {
    if (event?.program_url && videoRef.current) {
      initializePlayer();
    }
  }, [event?.program_url]);

  const loadEventData = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to event updates for program feed changes
    const eventChannel = supabase
      .channel('events')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          setEvent(payload.new as EventData);
        }
      )
      .subscribe();

    // Subscribe to camera switches via switch_logs
    const switchChannel = supabase
      .channel('switch_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'switch_logs', filter: `event_id=eq.${eventId}` },
        () => {
          // Reload the HLS player when camera switches
          if (hlsRef.current && event?.program_url) {
            hlsRef.current.loadSource(event.program_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(switchChannel);
    };
  };

  const initializePlayer = () => {
    if (!videoRef.current || !event?.program_url) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hlsRef.current = hls;
      hls.loadSource(event.program_url);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      videoRef.current.src = event.program_url;
      videoRef.current.addEventListener('loadedmetadata', () => {
        videoRef.current?.play();
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="aspect-video bg-muted animate-pulse" />
        
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <LoadingSkeleton variant="text" className="h-6 w-3/4" />
                  <LoadingSkeleton variant="text" className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <LoadingSkeleton variant="text" lines={3} />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <LoadingSkeleton variant="text" className="h-5 w-1/2" />
                </CardHeader>
                <CardContent>
                  <LoadingSkeleton variant="card" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <LoadingSkeleton variant="text" className="h-5 w-1/2" />
                </CardHeader>
                <CardContent>
                  <LoadingSkeleton variant="text" lines={4} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
            <p className="text-muted-foreground">
              The requested event could not be found or may have ended.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Video Player */}
      <div className="relative">
        <div className="aspect-video bg-black">
          {event.program_url && event.status === 'live' ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              muted
              autoPlay
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  {event.status === 'created' ? 'Stream Starting Soon' : 'Stream Offline'}
                </h3>
                <p className="opacity-75">
                  {event.status === 'created' 
                    ? 'The event will begin shortly. Stay tuned!' 
                    : 'This stream has ended.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Indicator */}
        {event.status === 'live' && (
          <div className="absolute top-4 left-4">
            <Badge variant="destructive" className="bg-red-600 animate-pulse">
              <Wifi className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          </div>
        )}

        {/* Viewer Count */}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-black/50 text-white">
            <Users className="h-3 w-3 mr-1" />
            {viewerCount.toLocaleString()} viewers
          </Badge>
        </div>
      </div>

      {/* Event Info */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span>Sport: {event.sport}</span>
                  <Badge variant={event.status === 'live' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Experience the action from multiple camera angles with our live multi-camera sports streaming.
                  Professional-grade coverage with real-time camera switching for the best viewing experience.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chat/Social Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Chat</CardTitle>
                <CardDescription>
                  Connect with other viewers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    Live chat integration would appear here
                    <br />
                    (YouTube/Twitch chat embeds)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Viewers</span>
                  <span className="text-sm font-medium">{viewerCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Stream Quality</span>
                  <span className="text-sm font-medium">1080p</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Latency</span>
                  <span className="text-sm font-medium">~3-5s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerPage;