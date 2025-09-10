/**
 * Isolated request popup component
 * This replaces the existing GlobalLiveRequestPopup with a cleaner implementation
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestNotifications } from '@/hooks/useRequestNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Utensils } from 'lucide-react';

export const IsolatedRequestPopup: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeNotification,
    isProcessing,
    dndEnabled,
    acceptRequest,
    ignoreRequest,
    viewResults
  } = useRequestNotifications();

  // Don't show if DND is enabled or no active notification
  if (dndEnabled || !activeNotification) {
    return null;
  }

  const handleAccept = async () => {
    if (isProcessing) return;
    
    if (activeNotification.type === 'request') {
      await acceptRequest(activeNotification.id);
      navigate(`/send-recommendation?requestId=${activeNotification.id}`);
    } else {
      await viewResults(activeNotification.id);
      navigate(`/request-results/${activeNotification.id}`);
    }
  };

  const handleIgnore = async () => {
    if (isProcessing) return;
    
    if (activeNotification.type === 'request') {
      await ignoreRequest(activeNotification.id);
    } else {
      await viewResults(activeNotification.id);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'quick': return 'text-red-500';
      case 'soon': return 'text-orange-500';
      default: return 'text-green-500';
    }
  };

  const isRequest = activeNotification.type === 'request';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm mx-auto bg-white dark:bg-gray-800 shadow-xl">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Utensils className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  {isRequest ? 'New Food Request!' : 'Results Ready!'}
                </h3>
              </div>
              
              <p className="text-2xl font-bold text-primary">
                {activeNotification.foodType}
              </p>
            </div>

            {/* Location */}
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{activeNotification.location}</span>
            </div>

            {/* Urgency (for requests only) */}
            {isRequest && (
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className={`text-sm font-medium ${getUrgencyColor(activeNotification.urgency)}`}>
                  {activeNotification.urgency === 'quick' && 'Quick (≤15 min)'}
                  {activeNotification.urgency === 'soon' && 'Soon (≤1 hour)'}
                  {activeNotification.urgency === 'extended' && 'Extended (>1 hour)'}
                </span>
              </div>
            )}

            {/* Restaurant info for recommendations */}
            {!isRequest && activeNotification.restaurantName && (
              <div className="text-sm text-muted-foreground">
                {activeNotification.restaurantName}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : (isRequest ? 'Accept' : 'View Results')}
              </Button>
              
              <Button
                onClick={handleIgnore}
                disabled={isProcessing}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                {isRequest ? 'Ignore' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};