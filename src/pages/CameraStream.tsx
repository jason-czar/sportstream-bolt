import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Camera, Mic, MicOff, Video, VideoOff, Settings, LogOut, SwitchCamera, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toastService } from '@/lib/toast-service';

interface LocationState {
  streamKey: string;
  ingestUrl: string;
  eventData: any;
}

const CameraStream: React.FC = () => {
  const { cameraId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [platformSelectOpen, setPlatformSelectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'twitch' | null>(null);
  const isMobile = useIsMobile();

  const state = location.state as LocationState;

  useEffect(() => {
    if (!state?.streamKey || !state?.ingestUrl) {
      toastService.error({
        description: "Missing stream configuration. Please join the event again.",
      });
      navigate('/join-camera');
      return;
    }

    startVideoPreview();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideoPreview = async (cameraFacing = facingMode) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: cameraFacing
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toastService.error({
        description: "Failed to access camera. Please check permissions.",
      });
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    await startVideoPreview(newFacingMode);
    toastService.success({
      description: `Switched to ${newFacingMode === 'environment' ? 'back' : 'front'} camera`,
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastService.success({
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toastService.error({
        description: "Failed to copy to clipboard",
      });
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleStartStreamClick = () => {
    setPlatformSelectOpen(true);
  };

  const startStreaming = async (platform: 'youtube' | 'twitch') => {
    setSelectedPlatform(platform);
    setPlatformSelectOpen(false);
    setIsStreaming(true);
    toastService.success({
      description: `Camera stream started to ${platform === 'youtube' ? 'YouTube' : 'Twitch'}!`,
    });
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    toastService.success({
      description: "Camera stream stopped.",
    });
  };

  const leaveEvent = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };

  if (!state) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile optimized layout */}
      <div className="flex flex-col h-screen">
        {/* Header - compact for mobile */}
        <div className="flex items-center justify-between p-4 bg-card border-b">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span className="font-semibold">Camera Operator</span>
            <Badge variant={isStreaming ? "default" : "secondary"} className="text-xs">
              {isStreaming ? "Live" : "Standby"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <span className="text-sm text-muted-foreground">
                Event: {state.eventData?.name || 'Unknown Event'}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={leaveEvent}>
              <LogOut className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Leave Event</span>}
            </Button>
          </div>
        </div>

        {/* Video Preview - takes most of the screen */}
        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Mobile event name overlay */}
          {isMobile && (
            <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
              Event: {state.eventData?.name || 'Unknown Event'}
            </div>
          )}
        </div>

        {/* Controls - bottom bar optimized for mobile and landscape */}
        <div className="p-4 bg-card border-t">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size={isMobile ? "default" : "lg"}
              onClick={toggleVideo}
              className="aspect-square"
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size={isMobile ? "default" : "lg"}
              onClick={toggleAudio}
              className="aspect-square"
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              variant="outline"
              size={isMobile ? "default" : "lg"}
              onClick={switchCamera}
              className="aspect-square"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>

            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size={isMobile ? "default" : "lg"} className="aspect-square">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh]">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Camera</h3>
                    <Button
                      variant="outline"
                      onClick={switchCamera}
                      className="w-full justify-start"
                    >
                      <SwitchCamera className="h-4 w-4 mr-2" />
                      Switch to {facingMode === 'environment' ? 'Front' : 'Back'} Camera
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Metadata</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Camera ID:</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(cameraId || '', 'Camera ID')}
                          className="text-xs font-mono"
                        >
                          {cameraId?.slice(0, 8)}...
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Stream Key:</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(state.streamKey, 'Stream Key')}
                          className="text-xs font-mono"
                        >
                          {state.streamKey.slice(0, 8)}...
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Ingest URL:</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(state.ingestUrl, 'Ingest URL')}
                          className="text-xs font-mono"
                        >
                          rtmp://...
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {!isStreaming ? (
              <Button size={isMobile ? "default" : "lg"} onClick={handleStartStreamClick} className="px-6">
                Start Streaming
              </Button>
            ) : (
              <Button size={isMobile ? "default" : "lg"} variant="destructive" onClick={stopStreaming} className="px-6">
                Stop Streaming
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Platform Selection Sheet */}
      <Sheet open={platformSelectOpen} onOpenChange={setPlatformSelectOpen}>
        <SheetContent side="bottom" className="h-[40vh]">
          <SheetHeader>
            <SheetTitle>Select Streaming Platform</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Choose where you want to stream:</p>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => startStreaming('youtube')}
                className="w-full justify-start h-12"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    YT
                  </div>
                  YouTube
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => startStreaming('twitch')}
                className="w-full justify-start h-12"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    T
                  </div>
                  Twitch
                </div>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CameraStream;