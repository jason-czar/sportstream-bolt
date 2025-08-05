import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toastService } from "@/lib/toast-service";

const AppHeader = () => {
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
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold hover:text-primary">
            Sportscast Live
          </Link>
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
  );
};

export default AppHeader;