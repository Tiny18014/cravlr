import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, User } from 'lucide-react';
import DebugRealtime from '@/components/DebugRealtime';
import DebugDBRealtime from '@/components/DebugDBRealtime';
import MobileDebugConsole from '@/components/MobileDebugConsole';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Remove individual realtime logic - now handled by global NotificationsProvider

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to Cravlr</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover amazing food recommendations from locals everywhere
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Get Started
          </Button>
        </div>
        
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4">
                <h3 className="font-semibold mb-2">🍕 Request Food</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us what type of food you're craving and your location
                </p>
              </div>
              <div className="text-center p-4">
                <h3 className="font-semibold mb-2">📱 Get Notified</h3>
                <p className="text-sm text-muted-foreground">
                  Locals get instant notifications about your request
                </p>
              </div>
              <div className="text-center p-4">
                <h3 className="font-semibold mb-2">⭐ Receive Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized suggestions from people who know the area
                </p>
              </div>
              <div className="text-center p-4">
                <h3 className="font-semibold mb-2">🎯 Find Great Food</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from ranked recommendations and enjoy your meal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cravlr</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome back, {user.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find great food?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Create a request or help others discover amazing restaurants
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/request-food')}
            >
              <CardHeader className="text-center">
                <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Request Food</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Looking for something delicious? Let locals help you find it!
                </p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/browse-requests')}
            >
              <CardHeader className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Give Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Share your favorite spots with food lovers in your area
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/dashboard')}
            >
              <CardHeader className="text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>My Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Track your requests and recommendations in one place
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Debug components for all pages */}
      <div className="fixed bottom-4 right-4 space-y-2">
        <DebugRealtime user={user} />
        <DebugDBRealtime user={user} />
        <MobileDebugConsole />
      </div>
    </div>
  );
};

export default Index;