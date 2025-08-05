import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Mic, MicOff, Video, VideoOff, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

  const startVideoPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
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

  const startStreaming = async () => {
    // TODO: Implement actual RTMP streaming
    setIsStreaming(true);
    toastService.success({
      description: "Camera stream started successfully!",
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <CardTitle className="text-lg">Camera Operator</CardTitle>
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "Live" : "Standby"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Event: {state.eventData?.name || 'Unknown Event'}
              </span>
              <Button variant="outline" size="sm" onClick={leaveEvent}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Event
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Video Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button variant="outline" size="lg">
                <Settings className="h-5 w-5" />
              </Button>

              {!isStreaming ? (
                <Button size="lg" onClick={startStreaming} className="px-8">
                  Start Streaming
                </Button>
              ) : (
                <Button size="lg" variant="destructive" onClick={stopStreaming} className="px-8">
                  Stop Streaming
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stream Info */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium">Camera ID:</label>
                <p className="text-muted-foreground">{cameraId}</p>
              </div>
              <div>
                <label className="font-medium">Stream Key:</label>
                <p className="text-muted-foreground font-mono">{state.streamKey}</p>
              </div>
              <div className="md:col-span-2">
                <label className="font-medium">Ingest URL:</label>
                <p className="text-muted-foreground font-mono break-all">{state.ingestUrl}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CameraStream;