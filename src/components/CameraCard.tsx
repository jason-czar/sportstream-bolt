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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(camera.id);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        camera.is_active 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:bg-muted/50'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={camera.is_active}
      aria-label={`${camera.device_label} camera ${camera.is_active ? 'active' : 'inactive'}, ${camera.is_live ? 'online' : 'offline'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium">{camera.device_label}</CardTitle>
          <div className="flex gap-2 items-center">
            {camera.is_live ? (
              <Wifi 
                className="h-4 w-4 text-success" 
                aria-label="Camera online"
              />
            ) : (
              <WifiOff 
                className="h-4 w-4 text-destructive" 
                aria-label="Camera offline"
              />
            )}
            {camera.is_active && (
              <Badge 
                variant="default" 
                className="text-xs animate-pulse"
                aria-label="Currently broadcasting live"
              >
                LIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="aspect-video bg-muted rounded-md flex items-center justify-center border-2 border-dashed border-muted-foreground/20"
          aria-hidden="true"
        >
          {camera.is_live ? (
            <div className="text-center">
              <div className="w-8 h-8 bg-destructive rounded-full mx-auto mb-2 animate-pulse shadow-lg"></div>
              <p className="text-xs text-muted-foreground font-medium">Live Feed</p>
            </div>
          ) : (
            <div className="text-center">
              <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground">Camera Offline</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

CameraCard.displayName = 'CameraCard';

export default CameraCard;