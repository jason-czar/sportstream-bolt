import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import LoadingButton from "@/components/ui/LoadingButton";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { toastService } from "@/lib/toast-service";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { supabase } from "@/integrations/supabase/client";
import ErrorMessage from "@/components/error/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Play, Square, Users, Wifi, WifiOff, Monitor, Settings, Eye, Youtube, Twitch, ExternalLink } from "lucide-react";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { useRealtimeEventUpdates } from "@/hooks/useRealtimeEventUpdates";
import CameraCard from "@/components/CameraCard";
import EventHeader from "@/components/EventHeader";

interface Camera {
  id: string;
  device_label: string;
  is_live: boolean;
  is_active: boolean;
  event_id: string;
}

interface EventData {
  id: string;
  name: string;
  sport: string;
  event_code: string;
  status: string;
  program_url: string;
  youtube_key?: string;
  twitch_key?: string;
}

const DirectorDashboard = () => {
  const { eventId } = useParams();
  const { handleAsyncError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId] = useState(`director_${Math.random().toString(36).substr(2, 9)}`);
  
  // Use real-time hooks
  const { viewerCount } = useRealtimePresence({ 
    eventId: eventId || '', 
    userId: currentUserId 
  });
  
  const { event, cameras, loading: dataLoading } = useRealtimeEventUpdates({
    eventId: eventId || ''
  });
  
  



  const setActiveCamera = useCallback(async (cameraId: string) => {
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

      const activeCamera = cameras.find(cam => cam.id === cameraId);
      if (activeCamera) {
        toastService.event.cameraSwitched(activeCamera.device_label);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toastService.error({
        description: "Failed to switch camera. Please try again.",
      });
    }
  }, [eventId, cameras]);

  const startStream = useCallback(async () => {
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

      toastService.event.streamStarted();
    } catch (error) {
      console.error('Error starting stream:', error);
      toastService.error({
        description: "Failed to start stream. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const endStream = useCallback(async () => {
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

      toastService.event.streamEnded();
    } catch (error) {
      console.error('Error ending stream:', error);
      toastService.error({
        description: "Failed to end stream. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const addSimulcastTargets = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('add-simulcast', {
        body: { eventId }
      });

      if (error) throw error;

      toastService.event.simulcastConfigured();
    } catch (error) {
      console.error('Error adding simulcast:', error);
      toastService.error({
        description: "Failed to configure simulcast targets. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const streaming = useMemo(() => event?.status === 'live', [event?.status]);

  if (dataLoading && !event) {
    return <LoadingSpinner fullScreen text="Loading director dashboard..." />;
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorMessage
          title="Unable to load director dashboard"
          message={error}
          onRetry={() => window.location.reload()}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Event Header */}
        {event && (
          <EventHeader
            event={event}
            viewerCount={viewerCount}
            streaming={streaming}
            loading={loading}
            onStartStream={startStream}
            onEndStream={endStream}
            onAddSimulcast={addSimulcastTargets}
            cameraCount={cameras.length}
          />
        )}

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
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  onActivate={setActiveCamera}
                />
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

        {/* Live Stream URLs */}
        {streaming && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Stream URLs
              </CardTitle>
              <CardDescription>
                Share these URLs with your audience to watch the live stream
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* YouTube Live URL */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Youtube className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">YouTube Live</p>
                    <p className="text-sm text-muted-foreground">Watch on @jason_czar</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.youtube.com/@jason_czar/live', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Live
                </Button>
              </div>

              {/* Twitch Live URL - You'll need to replace with your actual Twitch username */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Twitch className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Twitch Live</p>
                    <p className="text-sm text-muted-foreground">Watch on Twitch</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.twitch.tv/jason_czar', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Live
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>💡 These URLs will be active only when the stream is live. Share them with your audience!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DirectorDashboard;