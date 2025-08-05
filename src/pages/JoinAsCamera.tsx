import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Video, VideoOff, Loader2 } from "lucide-react";

const JoinAsCamera = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [eventCode, setEventCode] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  useEffect(() => {
    startVideoPreview();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideoPreview = async () => {
    try {
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
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Error",
        description: "Please allow camera and microphone access to continue.",
        variant: "destructive"
      });
    }
  };

  const validateEventCode = async () => {
    if (!eventCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event code.",
        variant: "destructive"
      });
      return;
    }

    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join as a camera operator.",
        variant: "destructive"
      });
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
        toast({
          title: "Invalid Event Code",
          description: "Event not found. Please check the code and try again.",
          variant: "destructive"
        });
        return;
      }

      setEventData(data);
      toast({
        title: "Event Found!",
        description: `Ready to join: ${data.name}`,
      });
    } catch (error) {
      console.error('Error validating event code:', error);
      toast({
        title: "Error",
        description: "Failed to validate event code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const registerCamera = async () => {
    if (!eventData || !deviceLabel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a device label and validate the event code first.",
        variant: "destructive"
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

      toast({
        title: "Camera Registered!",
        description: "You are now connected to the event. Start streaming when ready.",
      });

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
      toast({
        title: "Error",
        description: "Failed to register camera. Please try again.",
        variant: "destructive"
      });
    } finally {
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
                          disabled={loading || !eventCode.trim()}
                        >
                          Validate
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
                  disabled={loading || !eventData || !deviceLabel.trim() || !stream}
                >
                  {loading ? "Connecting..." : "Join Event as Camera"}
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