import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Play, Square, Users, Wifi, WifiOff, Monitor, Settings } from "lucide-react";

interface Camera {
  id: string;
  device_label: string;
  is_live: boolean;
  is_active: boolean;
  stream_key: string;
}

interface EventData {
  id: string;
  name: string;
  sport: string;
  event_code: string;
  status: string;
  program_url: string;
  youtube_key: string;
  twitch_key: string;
}

const DirectorDashboard = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
      loadCameras();
      subscribeToUpdates();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      setStreaming(data.status === 'live');
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: "Error",
        description: "Failed to load event data.",
        variant: "destructive"
      });
    }
  };

  const loadCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at');

      if (error) throw error;
      setCameras(data || []);
    } catch (error) {
      console.error('Error loading cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to camera updates
    const cameraChannel = supabase
      .channel('cameras')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cameras', filter: `event_id=eq.${eventId}` },
        () => loadCameras()
      )
      .subscribe();

    // Subscribe to event updates
    const eventChannel = supabase
      .channel('events')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => loadEventData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cameraChannel);
      supabase.removeChannel(eventChannel);
    };
  };

  const setActiveCamera = async (cameraId: string) => {
    try {
      // First, deactivate all cameras
      await supabase
        .from('cameras')
        .update({ is_active: false })
        .eq('event_id', eventId);

      // Then activate the selected camera
      const { error } = await supabase
        .from('cameras')
        .update({ is_active: true })
        .eq('id', cameraId);

      if (error) throw error;

      // Call edge function to switch camera and log the switch
      await supabase.functions.invoke('switch-camera', {
        body: { eventId, cameraId }
      });

      toast({
        title: "Camera Switched",
        description: "Program feed updated successfully.",
      });
    } catch (error) {
      console.error('Error switching camera:', error);
      toast({
        title: "Error",
        description: "Failed to switch camera.",
        variant: "destructive"
      });
    }
  };

  const startStream = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('start-stream', {
        body: { eventId }
      });

      if (error) throw error;

      await supabase
        .from('events')
        .update({ status: 'live' })
        .eq('id', eventId);

      setStreaming(true);
      toast({
        title: "Stream Started",
        description: "Live stream is now active!",
      });
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Error",
        description: "Failed to start stream.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const endStream = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('end-stream', {
        body: { eventId }
      });

      if (error) throw error;

      await supabase
        .from('events')
        .update({ status: 'ended' })
        .eq('id', eventId);

      setStreaming(false);
      toast({
        title: "Stream Ended",
        description: "Live stream has been stopped.",
      });
    } catch (error) {
      console.error('Error ending stream:', error);
      toast({
        title: "Error",
        description: "Failed to end stream.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSimulcastTargets = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('add-simulcast', {
        body: { eventId }
      });

      if (error) throw error;

      toast({
        title: "Simulcast Added",
        description: "YouTube and Twitch streams configured successfully.",
      });
    } catch (error) {
      console.error('Error adding simulcast:', error);
      toast({
        title: "Error",
        description: "Failed to configure simulcast targets.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading director dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Event Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-6 w-6" />
                  {event?.name}
                </CardTitle>
                <CardDescription>
                  Event Code: <span className="font-mono font-bold">{event?.event_code}</span> | 
                  Sport: {event?.sport} | 
                  Status: <Badge variant={streaming ? "default" : "secondary"}>
                    {event?.status}
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!streaming ? (
                  <Button onClick={startStream} disabled={loading || cameras.length === 0}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Stream
                  </Button>
                ) : (
                  <Button onClick={endStream} variant="destructive" disabled={loading}>
                    <Square className="h-4 w-4 mr-2" />
                    End Stream
                  </Button>
                )}
                
                {event?.youtube_key || event?.twitch_key ? (
                  <Button 
                    onClick={addSimulcastTargets} 
                    variant="outline"
                    disabled={loading || streaming}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Add Simulcast
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Camera Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Connected Cameras ({cameras.length}/8)
            </h2>
          </div>

          {cameras.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Cameras Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Share the event code <span className="font-mono font-bold">{event?.event_code}</span> with camera operators to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cameras.map((camera) => (
                <Card 
                  key={camera.id} 
                  className={`cursor-pointer transition-all ${
                    camera.is_active 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveCamera(camera.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm">{camera.device_label}</CardTitle>
                      <div className="flex gap-1">
                        {camera.is_live ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        {camera.is_active && (
                          <Badge variant="default" className="text-xs">LIVE</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                      {camera.is_live ? (
                        <div className="text-center">
                          <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-2 animate-pulse"></div>
                          <p className="text-xs text-muted-foreground">Live Feed</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Offline</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Program Feed Info */}
        {event?.program_url && (
          <Card>
            <CardHeader>
              <CardTitle>Program Feed</CardTitle>
              <CardDescription>
                Share this URL with viewers or embed in your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
                {event.program_url}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DirectorDashboard;