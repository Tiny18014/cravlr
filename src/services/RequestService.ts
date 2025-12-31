import { supabase } from "@/integrations/supabase/client";

export interface FoodRequest {
  id: string;
  food_type: string;
  expire_at: string;
  status: string;
  requester_id: string;
  location_city: string;
  location_state: string;
}

export interface Recommendation {
  id: string;
  request_id: string;
  recommender_id: string;
  restaurant_name: string;
  place_id?: string;
}

export class RequestService {
  static async getUserActiveRequests(userId: string): Promise<FoodRequest[]> {
    const { data, error } = await supabase
      .from("food_requests")
      .select("id, food_type, expire_at, status, requester_id, location_city, location_state")
      .eq("requester_id", userId)
      .eq("status", "active")
      .gt("expire_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error && error.code !== "PGRST116") {
      console.error("RequestService: Error fetching active requests:", error);
      return [];
    }
    return data || [];
  }

  static async getRequestRecommendations(requestId: string): Promise<Recommendation[]> {
    const { data, error } = await supabase
      .from('recommendations')
      .select('id, request_id, recommender_id, restaurant_name, place_id')
      .eq('request_id', requestId);

    if (error) {
      console.error("RequestService: Error fetching recommendations:", error);
      return [];
    }
    return data || [];
  }

  static async acceptRequest(requestId: string) {
    const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
      body: { requestId, action: 'accept' }
    });

    if (error) throw error;
    return data;
  }

  static async ignoreRequest(requestId: string) {
    const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
      body: { requestId, action: 'ignore' }
    });

    if (error) throw error;
    return data;
  }

  static async markNotificationRead(requestId: string, userId: string) {
    try {
      // Try updating 'read' column first
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('request_id', requestId)
        .eq('requester_id', userId);

      // Fallback for schema drift
      if (error && error.code === '42703') {
         await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('request_id', requestId)
          .eq('requester_id', userId);
      }
    } catch (error) {
      console.error("RequestService: Error marking notification as read:", error);
    }
  }

  static async markNotificationReadById(notificationId: string) {
    try {
      // Try updating 'read' column first
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      // Fallback for schema drift
      if (error && error.code === '42703') {
         await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
      }
    } catch (error) {
      console.error("RequestService: Error marking notification as read:", error);
    }
  }
}