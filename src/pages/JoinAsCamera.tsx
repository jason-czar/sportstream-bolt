import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { toastService } from "@/lib/toast-service";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { supabase } from "@/integrations/supabase/client";
import ErrorMessage from "@/components/error/ErrorMessage";
import { Camera, Video, VideoOff, Loader2 } from "lucide-react";

const JoinAsCamera = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { handleAsyncError } = useErrorHandler();
  const { isOnline } = useOnlineStatus();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [eventCode, setEventCode] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startVideoPreview();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideoPreview = async () => {
    setCameraError(null);
    
    const { error } = await handleAsyncError(async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      toastService.camera.accessGranted();
    }, {
      title: "Camera access failed",
      fallbackMessage: "Please allow camera and microphone access to continue.",
      showToast: true
    });

    if (error) {
      setCameraError("Camera access denied. Please enable permissions and try again.");
    }
  };

  const validateEventCode = async () => {
    if (!isOnline) {
      toastService.error({
        description: 'Cannot validate event code while offline. Please check your connection.'
      });
      return;
    }

    if (!eventCode.trim()) {
      toastService.error({
        description: "Please enter an event code.",
      });
      return;
    }

    if (!session) {
      toastService.auth.sessionExpired();
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode.toUpperCase())
        .single();

      if (error || !data) {
        toastService.event.eventNotFound();
        return;
      }

      setEventData(data);
      toastService.success({
        title: "Event found!",
        description: `Ready to join: ${data.name}`,
      });
    } catch (error) {
      console.error('Error validating event code:', error);
      toastService.error({
        description: "Failed to validate event code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const registerCamera = async () => {
    if (!eventData || !deviceLabel.trim()) {
      toastService.error({
        description: "Please enter a device label and validate the event code first.",
      });
      return;
    }

    setLoading(true);
    try {
      // Register camera with backend
      const { data, error } = await supabase.functions.invoke('register-camera', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          eventId: eventData.id,
          deviceLabel: deviceLabel.trim(),
          eventCode: eventCode.toUpperCase()
        }
      });

      if (error) throw error;

      toastService.event.cameraConnected(deviceLabel.trim());

      // Navigate to camera streaming page
      navigate(`/camera/${data.cameraId}`, {
        state: { 
          streamKey: data.streamKey,
          ingestUrl: data.ingestUrl,
          eventData 
        } 
      });
    } catch (error) {
      console.error('Error registering camera:', error);
      toastService.error({
        description: "Failed to register camera. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-6 w-6" />
              Join as Camera Operator
            </CardTitle>
            <CardDescription>
              Connect your device as a camera source for live streaming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Camera Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Camera Preview</h3>
                
                {cameraError ? (
                  <ErrorMessage
                    title="Camera Error"
                    message={cameraError}
                    onRetry={startVideoPreview}
                    variant="warning"
                  />
                ) : (
                  <div className="relative bg-muted rounded-lg aspect-video overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoOff className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={startVideoPreview} 
                  variant="outline" 
                  className="w-full"
                  disabled={!!stream}
                >
                  {stream ? "Camera Active" : "Enable Camera"}
                </Button>
              </div>

              {/* Event Connection */}
              <div className="space-y-6">
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="qr">QR Scanner</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventCode">Event Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="eventCode"
                          value={eventCode}
                          onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="uppercase"
                        />
                        <Button 
                          onClick={validateEventCode}
                          disabled={loading || !eventCode.trim() || !isOnline}
                        >
                          {!isOnline ? 'Offline' : 'Validate'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="qr" className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        QR code scanner will be implemented here
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {eventData && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Event Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {eventData.name}</p>
                      <p><strong>Sport:</strong> {eventData.sport}</p>
                      <p><strong>Status:</strong> {eventData.status}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="deviceLabel">Device Label</Label>
                  <Input
                    id="deviceLabel"
                    value={deviceLabel}
                    onChange={(e) => setDeviceLabel(e.target.value)}
                    placeholder="e.g., Left Corner Cam, Center Field"
                    required
                  />
                </div>

                <Button 
                  onClick={registerCamera}
                  className="w-full"
                  disabled={loading || !eventData || !deviceLabel.trim() || !stream || !isOnline}
                >
                  {loading ? "Connecting..." : !isOnline ? "Offline - Cannot Join Event" : "Join Event as Camera"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinAsCamera;