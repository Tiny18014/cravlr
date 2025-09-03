import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FoodRequest {
  id: string;
  requester_id: string;
  food_type: string;
  location_city: string;
  location_state: string;
  status: string;
  created_at: string;
  expires_at: string;
  profiles: {
    display_name: string;
  };
  recommendation_count?: number;
  user_has_recommended?: boolean;
  user_state?: "accepted" | "ignored" | null;
}

// ActionRow component implementing your exact spec
const ActionRow = ({ 
  request, 
  user, 
  onOpenSuggestion,
  handleRequestAction
}: { 
  request: FoodRequest; 
  user: any; 
  onOpenSuggestion: (req: FoodRequest) => void;
  handleRequestAction: (id: string, action: string) => void;
}) => {
  const navigate = useNavigate();
  
  // Role detection
  const role = request.requester_id === user?.id ? 'requester' : 'recommender';
  
  // State calculations
  const is_full = (request.recommendation_count || 0) >= 10;
  const now = Date.now();
  const expiresAt = new Date(request.expires_at).getTime();
  const time_left = expiresAt - now;
  const expired = time_left <= 0;
  const inactive = request.status !== 'active' || is_full || expired;

  console.log(`ActionRow for ${request.id}: role=${role}, inactive=${inactive}, is_full=${is_full}, expired=${expired}, user_has_recommended=${request.user_has_recommended}, user_state=${request.user_state}`);

  // Guardrail: Requester view
  if (role === 'requester') {
    const buttonText = request.status === 'active' 
      ? `View recommendations (${request.recommendation_count || 0})`
      : 'View final recommendations';
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate(`/request/${request.id}/results`)}
      >
        {buttonText}
      </Button>
    );
  }

  // Recommender view - following exact spec order
  
  // 1. Inactive states
  if (inactive) {
    if (is_full) return <Badge variant="secondary">Full (10/10)</Badge>;
    if (expired) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="secondary">Closed</Badge>;
  }

  // 2. Already recommended
  if (request.user_has_recommended) {
    return <Badge variant="outline" className="bg-green-50 text-green-700">✅ Already suggested</Badge>;
  }

  // 3. Ignored state
  if (request.user_state === 'ignored') {
    return <Badge variant="secondary">🙈 Ignored</Badge>;
  }

  // 4. Accepted but hasn't recommended yet
  if (request.user_state === 'accepted' && !request.user_has_recommended) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          You accepted
        </Badge>
        <Button 
          size="sm"
          onClick={() => onOpenSuggestion(request)}
        >
          <Send className="h-4 w-4 mr-2" />
          Suggest now
        </Button>
      </div>
    );
  }

  // 5. Default state - show Accept/Ignore
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRequestAction(request.id, 'ignore')}
        className="text-muted-foreground hover:text-foreground"
      >
        Ignore
      </Button>
      <Button
        variant="outline" 
        size="sm"
        onClick={() => handleRequestAction(request.id, 'accept')}
        className="text-green-700 border-green-200 hover:bg-green-50"
      >
        Accept
      </Button>
    </div>
  );
};

const BrowseRequestsWorking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FoodRequest[]>([]);

  // Mock data for testing
  useEffect(() => {
    if (user) {
      const mockRequests: FoodRequest[] = [
        {
          id: '1',
          requester_id: 'other-user-id', // Different from current user
          food_type: 'Pizza',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          profiles: { display_name: 'John Doe' },
          recommendation_count: 3,
          user_has_recommended: false,
          user_state: null
        },
        {
          id: '2',
          requester_id: user.id, // Current user is requester
          food_type: 'Sushi',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          profiles: { display_name: user.email },
          recommendation_count: 5,
          user_has_recommended: false,
          user_state: null
        },
        {
          id: '3',
          requester_id: 'other-user-id',
          food_type: 'Burgers',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          profiles: { display_name: 'Jane Smith' },
          recommendation_count: 2,
          user_has_recommended: true, // Already recommended
          user_state: 'accepted'
        },
        {
          id: '4',
          requester_id: 'other-user-id',
          food_type: 'Thai',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          profiles: { display_name: 'Mike Johnson' },
          recommendation_count: 1,
          user_has_recommended: false,
          user_state: 'accepted' // Accepted but not recommended yet
        },
        {
          id: '5',
          requester_id: 'other-user-id',
          food_type: 'Mexican',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          profiles: { display_name: 'Sarah Wilson' },
          recommendation_count: 10, // Full
          user_has_recommended: false,
          user_state: null
        },
        {
          id: '6',
          requester_id: 'other-user-id',
          food_type: 'Chinese',
          location_city: 'Charlotte',
          location_state: 'NC',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          profiles: { display_name: 'Tom Brown' },
          recommendation_count: 1,
          user_has_recommended: false,
          user_state: 'ignored' // Ignored
        }
      ];
      setRequests(mockRequests);
    }
  }, [user]);

  const handleRequestAction = (id: string, action: string) => {
    console.log(`Action: ${action} on request ${id}`);
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? { ...req, user_state: action as "accepted" | "ignored" }
        : req
    ));
  };

  const onOpenSuggestion = (request: FoodRequest) => {
    console.log('Opening suggestion for:', request.id);
    // This would open the suggestion modal
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
          <h1 className="text-2xl font-bold">Action Row Spec Test</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{request.food_type}</CardTitle>
                  <Badge variant="outline">
                    {request.requester_id === user.id ? 'YOUR REQUEST' : 'RECOMMEND'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Requested by {request.profiles?.display_name || 'Anonymous'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {request.location_city}, {request.location_state}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Created {new Date(request.created_at).toLocaleString()}
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                      {request.recommendation_count}/10 recommendations
                    </div>
                    <ActionRow 
                      request={request} 
                      user={user} 
                      onOpenSuggestion={onOpenSuggestion}
                      handleRequestAction={handleRequestAction}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default BrowseRequestsWorking;