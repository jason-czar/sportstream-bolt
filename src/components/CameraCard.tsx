import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface Camera {
  id: string;
  device_label: string;
  is_live: boolean;
  is_active: boolean;
  event_id: string;
}

interface CameraCardProps {
  camera: Camera;
  onActivate: (cameraId: string) => void;
}

const CameraCard = memo(({ camera, onActivate }: CameraCardProps) => {
  const handleClick = () => {
    onActivate(camera.id);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        camera.is_active 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:bg-muted/50'
      }`}
      onClick={handleClick}
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
  );
});

CameraCard.displayName = 'CameraCard';

export default CameraCard;