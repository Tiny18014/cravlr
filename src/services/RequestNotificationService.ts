/**
 * Isolated service for handling request notifications
 * This service manages the core notification logic independently
 */
import { supabase } from '@/integrations/supabase/client';

export type NotificationPing = {
  id: string;
  type: "request" | "recommendation";
  foodType: string;
  location: string;
  urgency: "quick" | "soon" | "extended";
  restaurantName?: string;
};

export interface NotificationConfig {
  dndEnabled: boolean;
  userId: string;
}

export class RequestNotificationService {
  private static instance: RequestNotificationService;
  private channel: any = null;
  private config: NotificationConfig | null = null;
  private listeners: Set<(ping: NotificationPing) => void> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): RequestNotificationService {
    if (!RequestNotificationService.instance) {
      RequestNotificationService.instance = new RequestNotificationService();
    }
    return RequestNotificationService.instance;
  }

  public initialize(config: NotificationConfig): void {
    console.log("🔔 Initializing notification service", config);
    this.config = config;
    this.setupChannel();
  }

  public updateConfig(config: Partial<NotificationConfig>): void {
    if (!this.config) return;
    
    this.config = { ...this.config, ...config };
    console.log("🔔 Updated notification config", this.config);

    // If DND was enabled, clear any existing notifications
    if (config.dndEnabled) {
      this.clearAllNotifications();
    }
  }

  public addListener(listener: (ping: NotificationPing) => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: (ping: NotificationPing) => void): void {
    this.listeners.delete(listener);
  }

  public async acceptRequest(requestId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'accept' }
      });

      if (error) throw error;
      console.log("✅ Request accepted:", data);
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      throw error;
    }
  }

  public async ignoreRequest(requestId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'ignore' }
      });

      if (error) throw error;
      console.log("✅ Request ignored:", data);
    } catch (error) {
      console.error("❌ Error ignoring request:", error);
      throw error;
    }
  }

  public async markNotificationRead(requestId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('requester_id', this.config?.userId);
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  }

  public destroy(): void {
    this.cleanup();
    this.listeners.clear();
    this.config = null;
  }

  private setupChannel(): void {
    if (!this.config) return;

    this.cleanup();

    console.log("🔔 Setting up notification channel for user:", this.config.userId);
    
    this.channel = supabase
      .channel('request-notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_requests' },
        (payload) => this.handleRequestInsert(payload.new)
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'food_requests' },
        (payload) => this.handleRequestUpdate(payload.new, payload.old)
      )
      .subscribe((status) => {
        console.log("🔔 Channel status:", status);
        
        if (status === 'CHANNEL_ERROR') {
          console.log("🔔 Channel error, reconnecting...");
          this.scheduleReconnect();
        }
      });
  }

  private handleRequestInsert(request: any): void {
    console.log("🔔 Received request insert:", { 
      request: request,
      dndEnabled: this.config?.dndEnabled,
      currentUserId: this.config?.userId,
      requesterId: request.requester_id
    });
    
    if (!this.config || this.config.dndEnabled) {
      console.log("🔔 Skipping notification - DND enabled or no config");
      return;
    }
    
    // Allow self-notifications in development for testing
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('lovableproject.com');
    if (!isDevelopment && request.requester_id === this.config.userId) {
      console.log("🔔 Skipping notification - self request in production");
      return;
    }

    // Check if collection period has ended
    const createdAt = new Date(request.created_at);
    const responseWindow = request.response_window || 1;
    const collectionEndTime = new Date(createdAt.getTime() + (responseWindow * 60 * 1000));
    const now = new Date();
    
    if (now < collectionEndTime) {
      // Schedule notification for after collection period
      const delay = collectionEndTime.getTime() - now.getTime();
      console.log(`🔔 Scheduling notification in ${delay}ms for request ${request.id}`);
      
      setTimeout(() => {
        if (!this.config?.dndEnabled) {
          this.emitNotification(this.createPingFromRequest(request));
        }
      }, delay);
    } else {
      // Show immediately
      this.emitNotification(this.createPingFromRequest(request));
    }
  }

  private handleRequestUpdate(request: any, oldRequest: any): void {
    if (!this.config) return;
    
    // Handle request results notification for requester
    if (request.requester_id === this.config.userId && 
        oldRequest?.status === 'active' && 
        (request.status === 'closed' || request.status === 'expired')) {
      
      this.checkAndEmitResultsNotification(request);
    }
  }

  private async checkAndEmitResultsNotification(request: any): Promise<void> {
    try {
      const { data: notification } = await supabase
        .from('notifications')
        .select('read_at')
        .eq('request_id', request.id)
        .eq('requester_id', this.config?.userId)
        .eq('type', 'request_results')
        .single();

      // Only show if no notification exists or it hasn't been read
      if (!notification || !notification.read_at) {
        const ping: NotificationPing = {
          id: request.id,
          type: "recommendation",
          foodType: request.food_type,
          location: `${request.location_city}, ${request.location_state}`,
          urgency: "soon",
          restaurantName: "Multiple restaurants"
        };

        this.emitNotification(ping);
      }
    } catch (error) {
      console.error("❌ Error checking notification status:", error);
    }
  }

  private createPingFromRequest(request: any): NotificationPing {
    return {
      id: request.id,
      type: "request",
      foodType: request.food_type,
      location: `${request.location_city}, ${request.location_state}`,
      urgency: request.response_window <= 15 ? 'quick' : 
              request.response_window <= 60 ? 'soon' : 'extended'
    };
  }

  private emitNotification(ping: NotificationPing): void {
    console.log("🔔 Emitting notification:", ping);
    this.listeners.forEach(listener => {
      try {
        listener(ping);
      } catch (error) {
        console.error("❌ Error in notification listener:", error);
      }
    });
  }

  private clearAllNotifications(): void {
    console.log("🔔 Clearing all notifications due to DND");
    // Emit a special clear signal
    this.listeners.forEach(listener => {
      try {
        listener({ id: 'CLEAR_ALL', type: 'request', foodType: '', location: '', urgency: 'quick' });
      } catch (error) {
        console.error("❌ Error in clear notification listener:", error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      console.log("🔔 Attempting to reconnect...");
      this.setupChannel();
    }, 2000);
  }

  private cleanup(): void {
    if (this.channel) {
      console.log("🔔 Cleaning up notification channel");
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}