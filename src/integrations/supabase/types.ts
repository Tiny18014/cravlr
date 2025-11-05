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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      business_profiles: {
        Row: {
          business_name: string
          commission_rate: number | null
          created_at: string
          default_ticket_value: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          commission_rate?: number | null
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          commission_rate?: number | null
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_requests: {
        Row: {
          additional_notes: string | null
          created_at: string
          expire_at: string
          food_type: string
          id: string
          location_address: string | null
          location_city: string
          location_state: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          created_at?: string
          expire_at: string
          food_type: string
          id?: string
          location_address?: string | null
          location_city: string
          location_state: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          created_at?: string
          expire_at?: string
          food_type?: string
          id?: string
          location_address?: string | null
          location_city?: string
          location_state?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          request_id: string
          requester_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          request_id: string
          requester_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          request_id?: string
          requester_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      points_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          points: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          notify_recommender: boolean | null
          points_this_month: number | null
          points_total: number | null
          streak_count: number
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          notify_recommender?: boolean | null
          points_this_month?: number | null
          points_total?: number | null
          streak_count?: number
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          notify_recommender?: boolean | null
          points_this_month?: number | null
          points_total?: number | null
          streak_count?: number
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          recommendation_id: string
          star_rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          recommendation_id: string
          star_rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          recommendation_id?: string
          star_rating?: number | null
          user_id?: string
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
          awarded_points: number | null
          confidence_score: number
          created_at: string
          id: string
          maps_url: string | null
          notes: string | null
          place_id: string | null
          recommender_id: string
          request_id: string
          restaurant_address: string | null
          restaurant_name: string
          status: string
          updated_at: string
        }
        Insert: {
          awarded_points?: number | null
          confidence_score: number
          created_at?: string
          id?: string
          maps_url?: string | null
          notes?: string | null
          place_id?: string | null
          recommender_id: string
          request_id: string
          restaurant_address?: string | null
          restaurant_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          awarded_points?: number | null
          confidence_score?: number
          created_at?: string
          id?: string
          maps_url?: string | null
          notes?: string | null
          place_id?: string | null
          recommender_id?: string
          request_id?: string
          restaurant_address?: string | null
          restaurant_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
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
          commission_paid: boolean
          commission_rate: number
          conversion_value: number | null
          converted: boolean
          id: string
          recommendation_id: string
          restaurant_name: string
          visit_confirmed_at: string | null
        }
        Insert: {
          clicked_at?: string
          commission_paid?: boolean
          commission_rate: number
          conversion_value?: number | null
          converted?: boolean
          id?: string
          recommendation_id: string
          restaurant_name: string
          visit_confirmed_at?: string | null
        }
        Update: {
          clicked_at?: string
          commission_paid?: boolean
          commission_rate?: number
          conversion_value?: number | null
          converted?: boolean
          id?: string
          recommendation_id?: string
          restaurant_name?: string
          visit_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "requester" | "recommender" | "admin"
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
      app_role: ["requester", "recommender", "admin"],
    },
  },
} as const
