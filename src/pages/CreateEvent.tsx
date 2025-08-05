import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    sportType: "",
    dateTime: "",
    expectedDuration: "",
    youtubeKey: "",
    twitchKey: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create an event.",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      // Generate unique event code
      const eventCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Call Supabase edge function to create event with Mux stream
      const { data, error } = await supabase.functions.invoke('create-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          name: formData.eventName,
          sport: formData.sportType,
          startTime: formData.dateTime,
          expectedDuration: parseInt(formData.expectedDuration),
          eventCode,
          youtubeKey: formData.youtubeKey,
          twitchKey: formData.twitchKey
        }
      });

      if (error) throw error;

      toast({
        title: "Event Created!",
        description: `Event code: ${eventCode}. Share this with camera operators.`,
      });

      navigate(`/director/${data.eventId}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Sports Event</CardTitle>
            <CardDescription>
              Set up a new multi-camera sports streaming event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={formData.eventName}
                  onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                  placeholder="Championship Soccer Match"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sportType">Sport Type</Label>
                <Select 
                  value={formData.sportType} 
                  onValueChange={(value) => setFormData({...formData, sportType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soccer">Soccer</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="baseball">Baseball</SelectItem>
                    <SelectItem value="tennis">Tennis</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateTime">Start Date & Time</Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData({...formData, dateTime: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDuration">Duration (minutes)</Label>
                  <Input
                    id="expectedDuration"
                    type="number"
                    value={formData.expectedDuration}
                    onChange={(e) => setFormData({...formData, expectedDuration: e.target.value})}
                    placeholder="90"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Simulcast Settings (Optional)</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="youtubeKey">YouTube Live Stream Key</Label>
                  <Input
                    id="youtubeKey"
                    type="password"
                    value={formData.youtubeKey}
                    onChange={(e) => setFormData({...formData, youtubeKey: e.target.value})}
                    placeholder="Enter YouTube stream key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitchKey">Twitch Stream Key</Label>
                  <Input
                    id="twitchKey"
                    type="password"
                    value={formData.twitchKey}
                    onChange={(e) => setFormData({...formData, twitchKey: e.target.value})}
                    placeholder="Enter Twitch stream key"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEvent;