import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Eye,
  Video,
  Radio
} from 'lucide-react';

interface RealtimeStatusDashboardProps {
  eventId: string;
  onlineUsers: any[];
  collaborationIndicators: any[];
  conflicts: any[];
  onResolveConflict: (index: number, resolution: 'local' | 'remote') => void;
  connectionStats: any;
  syncStats: any;
  onForceSync: () => void;
}

const RealtimeStatusDashboard: React.FC<RealtimeStatusDashboardProps> = ({
  onlineUsers,
  conflicts,
  onResolveConflict,
  connectionStats,
  syncStats,
  onForceSync
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-warning';
      case 'poor': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wifi className={`h-4 w-4 ${getConnectionColor(connectionStats.connectionQuality)}`} />
            Real-time Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge 
              variant={connectionStats.connected ? 'default' : 'destructive'}
              className="text-xs"
            >
              {connectionStats.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </CardContent>
      </Card>

      {/* Online Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Online Users ({onlineUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineUsers.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No users currently online
            </div>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map((user, index) => (
                <div key={user.user_id || index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {(user.display_name || user.user_id)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {user.display_name || `User ${user.user_id?.slice(0, 8)}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">online</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      {(syncStats.pendingCount > 0 || syncStats.isSyncing) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Updates</span>
              <Badge variant="outline" className="text-xs">
                {syncStats.pendingCount}
              </Badge>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onForceSync}
              disabled={syncStats.isSyncing}
              className="w-full text-xs"
            >
              Force Sync Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Data Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.map((conflict, index) => (
              <Alert key={index}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="text-sm">
                    Conflict in <strong>{conflict.table}</strong>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResolveConflict(index, 'local')}
                      className="text-xs"
                    >
                      Keep Local
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResolveConflict(index, 'remote')}
                      className="text-xs"
                    >
                      Keep Remote
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealtimeStatusDashboard;