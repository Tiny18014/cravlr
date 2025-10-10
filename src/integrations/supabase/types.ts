export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      action_rate_limits: {
        Row: {
          action_type: string
          id: string
          ip_address: unknown | null
          performed_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          id?: string
          ip_address?: unknown | null
          performed_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          id?: string
          ip_address?: unknown | null
          performed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_claims: {
        Row: {
          business_email: string
          business_phone: string | null
          claimed_at: string | null
          created_at: string
          email_verification_code: string | null
          email_verification_sent_at: string | null
          email_verified: boolean | null
          id: string
          phone_verification_code: string | null
          phone_verification_sent_at: string | null
          phone_verified: boolean | null
          place_id: string | null
          restaurant_name: string
          status: string
          updated_at: string
          user_id: string
          verification_notes: string | null
          verification_step: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_email: string
          business_phone?: string | null
          claimed_at?: string | null
          created_at?: string
          email_verification_code?: string | null
          email_verification_sent_at?: string | null
          email_verified?: boolean | null
          id?: string
          phone_verification_code?: string | null
          phone_verification_sent_at?: string | null
          phone_verified?: boolean | null
          place_id?: string | null
          restaurant_name: string
          status?: string
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verification_step?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_email?: string
          business_phone?: string | null
          claimed_at?: string | null
          created_at?: string
          email_verification_code?: string | null
          email_verification_sent_at?: string | null
          email_verified?: boolean | null
          id?: string
          phone_verification_code?: string | null
          phone_verification_sent_at?: string | null
          phone_verified?: boolean | null
          place_id?: string | null
          restaurant_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_step?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          business_address: string | null
          business_name: string
          business_website: string | null
          commission_rate: number | null
          contact_name: string
          created_at: string
          default_ticket_value: number | null
          id: string
          is_premium: boolean | null
          premium_started_at: string | null
          stripe_subscription_id: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_name: string
          business_website?: string | null
          commission_rate?: number | null
          contact_name: string
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          is_premium?: boolean | null
          premium_started_at?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_name?: string
          business_website?: string | null
          commission_rate?: number | null
          contact_name?: string
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          is_premium?: boolean | null
          premium_started_at?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_requests: {
        Row: {
          additional_notes: string | null
          closed_at: string | null
          created_at: string
          expires_at: string
          food_type: string
          id: string
          location_address: string | null
          location_city: string
          location_lat: number | null
          location_lng: number | null
          location_state: string
          requester_id: string
          response_window: number
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          closed_at?: string | null
          created_at?: string
          expires_at?: string
          food_type: string
          id?: string
          location_address?: string | null
          location_city: string
          location_lat?: number | null
          location_lng?: number | null
          location_state: string
          requester_id: string
          response_window?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          closed_at?: string | null
          created_at?: string
          expires_at?: string
          food_type?: string
          id?: string
          location_address?: string | null
          location_city?: string
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string
          requester_id?: string
          response_window?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          request_id: string
          requester_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          request_id: string
          requester_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          request_id?: string
          requester_id?: string
          type?: string
        }
        Relationships: []
      }
      points_events: {
        Row: {
          created_at: string
          id: string
          points: number
          referral_click_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          referral_click_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          referral_click_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_rate: number | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          do_not_disturb: boolean
          email: string
          id: string
          is_active: boolean
          is_admin: boolean
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_state: string | null
          notification_email: string | null
          notify_recommender: boolean
          persona: Database["public"]["Enums"]["persona"]
          points_this_month: number
          points_total: number
          positive_feedbacks: number | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reputation_score: number | null
          timezone: string | null
          total_feedbacks: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_rate?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          do_not_disturb?: boolean
          email: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_email?: string | null
          notify_recommender?: boolean
          persona?: Database["public"]["Enums"]["persona"]
          points_this_month?: number
          points_total?: number
          positive_feedbacks?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reputation_score?: number | null
          timezone?: string | null
          total_feedbacks?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_rate?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          do_not_disturb?: boolean
          email?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_email?: string | null
          notify_recommender?: boolean
          persona?: Database["public"]["Enums"]["persona"]
          points_this_month?: number
          points_total?: number
          positive_feedbacks?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reputation_score?: number | null
          timezone?: string | null
          total_feedbacks?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string | null
          id: string
          player_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          id?: string
          player_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          id?: string
          player_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          created_at: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          recommendation_id: string
          requester_id: string
          star_rating: number | null
        }
        Insert: {
          created_at?: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id?: string
          recommendation_id: string
          requester_id: string
          star_rating?: number | null
        }
        Update: {
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          recommendation_id?: string
          requester_id?: string
          star_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          awarded_at: string | null
          awarded_points: number | null
          confidence_score: number
          created_at: string
          id: string
          maps_url: string | null
          notes: string | null
          photo_token: string | null
          place_id: string | null
          price_level: number | null
          rating: number | null
          recommender_id: string
          reputation_multiplier: number | null
          request_id: string
          restaurant_address: string | null
          restaurant_name: string
          restaurant_phone: string | null
          restaurant_slug: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_points?: number | null
          confidence_score?: number
          created_at?: string
          id?: string
          maps_url?: string | null
          notes?: string | null
          photo_token?: string | null
          place_id?: string | null
          price_level?: number | null
          rating?: number | null
          recommender_id: string
          reputation_multiplier?: number | null
          request_id: string
          restaurant_address?: string | null
          restaurant_name: string
          restaurant_phone?: string | null
          restaurant_slug?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_points?: number | null
          confidence_score?: number
          created_at?: string
          id?: string
          maps_url?: string | null
          notes?: string | null
          photo_token?: string | null
          place_id?: string | null
          price_level?: number | null
          rating?: number | null
          recommender_id?: string
          reputation_multiplier?: number | null
          request_id?: string
          restaurant_address?: string | null
          restaurant_name?: string
          restaurant_phone?: string | null
          restaurant_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recommendations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          business_notes: string | null
          click_source: string
          clicked_at: string
          commission_amount: number | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          commission_rate: number
          conversion_at: string | null
          conversion_method: string | null
          conversion_value: number | null
          converted: boolean
          converted_at: string | null
          id: string
          ip_address: unknown | null
          notes: string | null
          place_id: string | null
          recommendation_id: string
          recommender_id: string
          referral_link_id: string | null
          reported_by: string | null
          request_id: string
          requester_id: string
          restaurant_name: string
          user_agent: string | null
          visit_date: string | null
        }
        Insert: {
          business_notes?: string | null
          click_source?: string
          clicked_at?: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_rate?: number
          conversion_at?: string | null
          conversion_method?: string | null
          conversion_value?: number | null
          converted?: boolean
          converted_at?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          place_id?: string | null
          recommendation_id: string
          recommender_id: string
          referral_link_id?: string | null
          reported_by?: string | null
          request_id: string
          requester_id: string
          restaurant_name?: string
          user_agent?: string | null
          visit_date?: string | null
        }
        Update: {
          business_notes?: string | null
          click_source?: string
          clicked_at?: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_rate?: number
          conversion_at?: string | null
          conversion_method?: string | null
          conversion_value?: number | null
          converted?: boolean
          converted_at?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          place_id?: string | null
          recommendation_id?: string
          recommender_id?: string
          referral_link_id?: string | null
          reported_by?: string | null
          request_id?: string
          requester_id?: string
          restaurant_name?: string
          user_agent?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          maps_url: string | null
          place_id: string | null
          recommendation_id: string
          referral_code: string
          request_id: string
          restaurant_name: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          maps_url?: string | null
          place_id?: string | null
          recommendation_id: string
          referral_code: string
          request_id: string
          restaurant_name: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          maps_url?: string | null
          place_id?: string | null
          recommendation_id?: string
          referral_code?: string
          request_id?: string
          restaurant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_user_state: {
        Row: {
          created_at: string
          id: string
          request_id: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_user_state_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_business_commissions: {
        Row: {
          business_notes: string | null
          click_id: string | null
          clicked_at: string | null
          commission_amount: number | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          place_id: string | null
          recommender_id: string | null
          recommender_name: string | null
          restaurant_name: string | null
          spend_amount: number | null
          user_id: string | null
          visit_confirmed_at: string | null
          visit_date: string | null
        }
        Relationships: []
      }
      view_referral_conversions_recent: {
        Row: {
          awarded_points: number | null
          click_source: string | null
          clicked_at: string | null
          commission_amount: number | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          commission_rate: number | null
          conversion_at: string | null
          conversion_method: string | null
          conversion_value: number | null
          converted: boolean | null
          converted_at: string | null
          id: string | null
          ip_address: unknown | null
          notes: string | null
          place_id: string | null
          recommendation_id: string | null
          recommender_id: string | null
          recommender_name: string | null
          referral_link_id: string | null
          reported_by: string | null
          request_id: string | null
          requester_id: string | null
          requester_name: string | null
          restaurant_name: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      award_points_for_request: {
        Args: { request_id_param: string }
        Returns: number
      }
      award_points_with_feedback: {
        Args: { base_points: number; feedback_bonus?: number; rec_id: string }
        Returns: undefined
      }
      can_perform_sensitive_action: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      close_expired_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_business_analytics: {
        Args: { business_user_id?: string }
        Returns: {
          conversions: number
          paid_commission: number
          pending_commission: number
          place_id: string
          restaurant_name: string
          total_clicks: number
          total_commission: number
          user_id: string
        }[]
      }
      get_public_profile_info: {
        Args: { profile_user_id: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      get_request_results: {
        Args: { p_request_id: string }
        Returns: {
          food_type: string
          mention_count: number
          place_id: string
          rec_ids: string[]
          request_id: string
          restaurant_name: string
          status: string
        }[]
      }
      get_unpaid_commissions: {
        Args: { business_user_id: string }
        Returns: number
      }
      is_admin: {
        Args: { uid?: string }
        Returns: boolean
      }
      is_email_verified: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_conversion: {
        Args: {
          p_commission_rate?: number
          p_conversion_method?: string
          p_conversion_value?: number
          p_notes?: string
          p_referral_click_id: string
        }
        Returns: {
          commission_amount: number
          conversion_value: number
          converted: boolean
          id: string
          recommender_id: string
          restaurant_name: string
        }[]
      }
      send_phone_verification: {
        Args: { claim_id: string; phone_number: string }
        Returns: boolean
      }
      update_recommender_reputation: {
        Args: { rec_id: string }
        Returns: undefined
      }
      verify_business_email_domain: {
        Args: { email: string; restaurant_name: string }
        Returns: boolean
      }
      verify_phone_code: {
        Args: { claim_id: string; provided_code: string }
        Returns: boolean
      }
    }
    Enums: {
      feedback_type: "thumbs_up" | "thumbs_down"
      persona: "requester" | "recommender" | "both"
      request_status:
        | "active"
        | "completed"
        | "expired"
        | "closed"
        | "fulfilled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      feedback_type: ["thumbs_up", "thumbs_down"],
      persona: ["requester", "recommender", "both"],
      request_status: ["active", "completed", "expired", "closed", "fulfilled"],
    },
  },
} as const
