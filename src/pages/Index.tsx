import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, Monitor, Play, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { toastService } from "@/lib/toast-service";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toastService.auth.signOutSuccess();
    } catch (error) {
      console.error('Error signing out:', error);
      toastService.error({
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Sportscast Live</h1>
            <nav className="flex items-center space-x-6">
              {user ? (
                <>
                  <div className="hidden md:flex space-x-6">
                    <Link to="/" className="text-foreground hover:text-primary">Home</Link>
                    <Link to="/create-event" className="text-foreground hover:text-primary">Create Event</Link>
                    <Link to="/join-camera" className="text-foreground hover:text-primary">Join as Camera</Link>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{profile?.full_name || user.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      disabled={loading}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">
            Multi-Camera Sports Streaming
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Film amateur sports with any iPhone, choose live camera angles, and simulcast to YouTube Live and Twitch. 
            Professional-grade multi-camera coverage made simple.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/create-event">
                <Video className="h-5 w-5 mr-2" />
                Create Event
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/join-camera">
                <Users className="h-5 w-5 mr-2" />
                Join as Camera
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" />
                Multi-Camera Setup
              </CardTitle>
              <CardDescription>
                Connect up to 8 iPhone cameras for comprehensive coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Each camera operator gets a unique QR code for instant connection. 
                Stream directly to our platform with minimal setup required.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-6 w-6 text-primary" />
                Live Direction
              </CardTitle>
              <CardDescription>
                Real-time camera switching and program control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Director dashboard shows all camera feeds. Click any camera thumbnail 
                to switch the live program feed instantly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-6 w-6 text-primary" />
                Simulcast Streaming
              </CardTitle>
              <CardDescription>
                Broadcast simultaneously to multiple platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stream to YouTube Live and Twitch simultaneously while maintaining 
                low latency for live betting and engagement.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mb-4 mx-auto">
                1
              </div>
              <h3 className="font-semibold mb-2">Create Event</h3>
              <p className="text-sm text-muted-foreground">
                Set up your sports event with details and streaming keys
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mb-4 mx-auto">
                2
              </div>
              <h3 className="font-semibold mb-2">Connect Cameras</h3>
              <p className="text-sm text-muted-foreground">
                Camera operators scan QR codes to join the event
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mb-4 mx-auto">
                3
              </div>
              <h3 className="font-semibold mb-2">Direct Live</h3>
              <p className="text-sm text-muted-foreground">
                Switch between camera angles in real-time
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mb-4 mx-auto">
                4
              </div>
              <h3 className="font-semibold mb-2">Stream & Share</h3>
              <p className="text-sm text-muted-foreground">
                Broadcast to multiple platforms simultaneously
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
