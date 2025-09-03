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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          do_not_disturb: boolean
          email: string
          id: string
          is_active: boolean
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_state: string | null
          notification_email: string | null
          notify_recommender: boolean
          points_this_month: number
          points_total: number
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          do_not_disturb?: boolean
          email: string
          id?: string
          is_active?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_email?: string | null
          notify_recommender?: boolean
          points_this_month?: number
          points_total?: number
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          do_not_disturb?: boolean
          email?: string
          id?: string
          is_active?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_email?: string | null
          notify_recommender?: boolean
          points_this_month?: number
          points_total?: number
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"]
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
      recommendations: {
        Row: {
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
          request_id: string
          restaurant_address: string | null
          restaurant_name: string
          restaurant_phone: string | null
          restaurant_slug: string | null
        }
        Insert: {
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
          request_id: string
          restaurant_address?: string | null
          restaurant_name: string
          restaurant_phone?: string | null
          restaurant_slug?: string | null
        }
        Update: {
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
          clicked_at: string
          commission_amount: number | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          conversion_value: number | null
          converted: boolean | null
          converted_at: string | null
          id: string
          ip_address: unknown | null
          recommendation_id: string
          recommender_id: string
          referral_link_id: string
          request_id: string
          requester_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          id?: string
          ip_address?: unknown | null
          recommendation_id: string
          recommender_id: string
          referral_link_id: string
          request_id: string
          requester_id: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          id?: string
          ip_address?: unknown | null
          recommendation_id?: string
          recommender_id?: string
          referral_link_id?: string
          request_id?: string
          requester_id?: string
          user_agent?: string | null
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
      [_ in never]: never
    }
    Functions: {
      award_points_for_request: {
        Args: { request_id_param: string }
        Returns: number
      }
      close_expired_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      request_status: "active" | "completed" | "expired"
      user_role: "requester" | "recommender" | "both"
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
      request_status: ["active", "completed", "expired"],
      user_role: ["requester", "recommender", "both"],
    },
  },
} as const
