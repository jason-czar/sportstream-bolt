import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Share } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EventQRCodeProps {
  eventCode: string;
  eventName: string;
}

const EventQRCode = ({ eventCode, eventName }: EventQRCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate the URL that will be encoded in the QR code
  const joinUrl = `${window.location.origin}/join-camera?code=${eventCode}`;

  useEffect(() => {
    if (canvasRef.current && eventCode) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('QR Code generation error:', error);
        }
      });
    }
  }, [joinUrl, eventCode]);

  const downloadQRCode = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${eventName}-qr-code.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "QR Code Downloaded",
        description: "The QR code has been saved to your downloads folder.",
      });
    }
  };

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${eventName} as Camera Operator`,
          text: `Scan this QR code or use event code: ${eventCode}`,
          url: joinUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      toast({
        title: "Link Copied",
        description: "The join link has been copied to your clipboard.",
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Camera Operator QR Code
        </CardTitle>
        <CardDescription>
          Camera operators can scan this QR code to quickly join the event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <canvas ref={canvasRef} />
          </div>
          
          <div className="text-center space-y-2">
            <p className="font-mono text-lg font-bold">{eventCode}</p>
            <p className="text-sm text-muted-foreground">
              Event Code (manual entry)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={downloadQRCode} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={shareQRCode} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>💡 Camera operators can either:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Scan the QR code with their phone camera</li>
            <li>Manually enter the event code: <span className="font-mono">{eventCode}</span></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventQRCode;