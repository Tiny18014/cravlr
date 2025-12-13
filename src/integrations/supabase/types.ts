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
      business_claims: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          place_id: string
          restaurant_name: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          place_id: string
          restaurant_name: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          place_id?: string
          restaurant_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          business_name: string
          commission_rate: number | null
          created_at: string
          default_ticket_value: number | null
          id: string
          is_premium: boolean | null
          place_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          commission_rate?: number | null
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          is_premium?: boolean | null
          place_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          commission_rate?: number | null
          created_at?: string
          default_ticket_value?: number | null
          id?: string
          is_premium?: boolean | null
          place_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          onesignal_player_id: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          onesignal_player_id?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          onesignal_player_id?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_notification_logs: {
        Row: {
          created_at: string
          email_to: string
          entity_id: string
          error_message: string | null
          event_type: string
          id: string
          provider_message_id: string | null
          sent_at: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_to: string
          entity_id: string
          error_message?: string | null
          event_type: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_to?: string
          entity_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_requests: {
        Row: {
          additional_notes: string | null
          country_code: string | null
          created_at: string
          expire_at: string
          food_type: string
          id: string
          lat: number | null
          lng: number | null
          location_address: string | null
          location_city: string
          location_state: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          country_code?: string | null
          created_at?: string
          expire_at: string
          food_type: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_address?: string | null
          location_city: string
          location_state: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          country_code?: string | null
          created_at?: string
          expire_at?: string
          food_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_address?: string | null
          location_city?: string
          location_state?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      guru_map_likes: {
        Row: {
          created_at: string
          id: string
          map_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          map_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          map_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guru_map_likes_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "guru_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      guru_map_places: {
        Row: {
          added_by: string
          created_at: string
          id: string
          map_id: string
          notes: string | null
          place_id: string
          place_name: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          map_id: string
          notes?: string | null
          place_id: string
          place_name: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          map_id?: string
          notes?: string | null
          place_id?: string
          place_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "guru_map_places_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "guru_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      guru_maps: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          admin_hierarchy: Json | null
          city: string | null
          continent: string | null
          country_code: string | null
          country_name: string | null
          county: string | null
          created_at: string
          formatted_address: string
          house_number: string | null
          id: string
          lat: number
          lng: number
          neighborhood: string | null
          place_label: string | null
          postal_code: string | null
          raw_provider_response: Json | null
          region: string | null
          source: string
          street: string | null
          suburb: string | null
          updated_at: string
        }
        Insert: {
          admin_hierarchy?: Json | null
          city?: string | null
          continent?: string | null
          country_code?: string | null
          country_name?: string | null
          county?: string | null
          created_at?: string
          formatted_address: string
          house_number?: string | null
          id?: string
          lat: number
          lng: number
          neighborhood?: string | null
          place_label?: string | null
          postal_code?: string | null
          raw_provider_response?: Json | null
          region?: string | null
          source?: string
          street?: string | null
          suburb?: string | null
          updated_at?: string
        }
        Update: {
          admin_hierarchy?: Json | null
          city?: string | null
          continent?: string | null
          country_code?: string | null
          country_name?: string | null
          county?: string | null
          created_at?: string
          formatted_address?: string
          house_number?: string | null
          id?: string
          lat?: number
          lng?: number
          neighborhood?: string | null
          place_label?: string | null
          postal_code?: string | null
          raw_provider_response?: Json | null
          region?: string | null
          source?: string
          street?: string | null
          suburb?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          notification_type: string
          payload: Json
          processed_at: string | null
          scheduled_for: string
          status: string
          target_user_ids: string[]
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          notification_type: string
          payload: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          target_user_ids: string[]
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          notification_type?: string
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          target_user_ids?: string[]
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
      places: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          formatted_address: string
          id: string
          lat: number
          lng: number
          name: string
          neighborhood: string | null
          price_level: number | null
          provider: string
          provider_place_id: string
          rating: number | null
          raw_provider_response: Json | null
          suburb: string | null
          types: Json | null
          updated_at: string
          user_ratings_total: number | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          formatted_address: string
          id?: string
          lat: number
          lng: number
          name: string
          neighborhood?: string | null
          price_level?: number | null
          provider?: string
          provider_place_id: string
          rating?: number | null
          raw_provider_response?: Json | null
          suburb?: string | null
          types?: Json | null
          updated_at?: string
          user_ratings_total?: number | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          formatted_address?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          neighborhood?: string | null
          price_level?: number | null
          provider?: string
          provider_place_id?: string
          rating?: number | null
          raw_provider_response?: Json | null
          suburb?: string | null
          types?: Json | null
          updated_at?: string
          user_ratings_total?: number | null
        }
        Relationships: []
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
          cuisine_expertise: string[] | null
          display_name: string | null
          email_new_requests: boolean | null
          email_notifications_enabled: boolean | null
          email_recommendations: boolean | null
          email_visit_reminders: boolean | null
          id: string
          last_feedback_date: string | null
          level: string | null
          location_city: string | null
          location_state: string | null
          notification_radius_km: number | null
          notify_recommender: boolean | null
          persona: string | null
          points_this_month: number | null
          points_total: number | null
          profile_country: string | null
          profile_image_url: string | null
          profile_lat: number | null
          profile_lng: number | null
          recommender_paused: boolean | null
          recommender_paused_at: string | null
          search_range: string | null
          streak_count: number
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuisine_expertise?: string[] | null
          display_name?: string | null
          email_new_requests?: boolean | null
          email_notifications_enabled?: boolean | null
          email_recommendations?: boolean | null
          email_visit_reminders?: boolean | null
          id: string
          last_feedback_date?: string | null
          level?: string | null
          location_city?: string | null
          location_state?: string | null
          notification_radius_km?: number | null
          notify_recommender?: boolean | null
          persona?: string | null
          points_this_month?: number | null
          points_total?: number | null
          profile_country?: string | null
          profile_image_url?: string | null
          profile_lat?: number | null
          profile_lng?: number | null
          recommender_paused?: boolean | null
          recommender_paused_at?: string | null
          search_range?: string | null
          streak_count?: number
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuisine_expertise?: string[] | null
          display_name?: string | null
          email_new_requests?: boolean | null
          email_notifications_enabled?: boolean | null
          email_recommendations?: boolean | null
          email_visit_reminders?: boolean | null
          id?: string
          last_feedback_date?: string | null
          level?: string | null
          location_city?: string | null
          location_state?: string | null
          notification_radius_km?: number | null
          notify_recommender?: boolean | null
          persona?: string | null
          points_this_month?: number | null
          points_total?: number | null
          profile_country?: string | null
          profile_image_url?: string | null
          profile_lat?: number | null
          profile_lng?: number | null
          recommender_paused?: boolean | null
          recommender_paused_at?: string | null
          search_range?: string | null
          streak_count?: number
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          action_type: string
          attempted_at: string
          created_at: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          photo_urls: string[] | null
          points_awarded: number | null
          recommendation_id: string
          star_rating: number | null
          thumbs_up: boolean | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          photo_urls?: string[] | null
          points_awarded?: number | null
          recommendation_id: string
          star_rating?: number | null
          thumbs_up?: boolean | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          photo_urls?: string[] | null
          points_awarded?: number | null
          recommendation_id?: string
          star_rating?: number | null
          thumbs_up?: boolean | null
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
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "view_business_commissions"
            referencedColumns: ["recommendation_id"]
          },
        ]
      }
      recommendations: {
        Row: {
          awarded_points: number | null
          confidence_score: number
          created_at: string
          id: string
          last_reminder_sent_at: string | null
          maps_url: string | null
          notes: string | null
          place_id: string | null
          recommender_id: string
          request_id: string
          restaurant_address: string | null
          restaurant_name: string
          status: string
          updated_at: string
          visit_checked_at: string | null
          visit_reminder_count: number | null
        }
        Insert: {
          awarded_points?: number | null
          confidence_score: number
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          maps_url?: string | null
          notes?: string | null
          place_id?: string | null
          recommender_id: string
          request_id: string
          restaurant_address?: string | null
          restaurant_name: string
          status?: string
          updated_at?: string
          visit_checked_at?: string | null
          visit_reminder_count?: number | null
        }
        Update: {
          awarded_points?: number | null
          confidence_score?: number
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          maps_url?: string | null
          notes?: string | null
          place_id?: string | null
          recommender_id?: string
          request_id?: string
          restaurant_address?: string | null
          restaurant_name?: string
          status?: string
          updated_at?: string
          visit_checked_at?: string | null
          visit_reminder_count?: number | null
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
      recommender_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          recommendation_id: string | null
          recommender_id: string
          restaurant_name: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          recommendation_id?: string | null
          recommender_id: string
          restaurant_name: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          recommendation_id?: string | null
          recommender_id?: string
          restaurant_name?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommender_notifications_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommender_notifications_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "view_business_commissions"
            referencedColumns: ["recommendation_id"]
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
          recommender_id: string | null
          referral_link_id: string | null
          request_id: string | null
          requester_id: string | null
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
          recommender_id?: string | null
          referral_link_id?: string | null
          request_id?: string | null
          requester_id?: string | null
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
          recommender_id?: string | null
          referral_link_id?: string | null
          request_id?: string | null
          requester_id?: string | null
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
          {
            foreignKeyName: "referral_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "view_business_commissions"
            referencedColumns: ["recommendation_id"]
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
          commission_rate: number | null
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
          commission_rate?: number | null
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
          commission_rate?: number | null
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
            foreignKeyName: "referral_links_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "view_business_commissions"
            referencedColumns: ["recommendation_id"]
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
      user_current_locations: {
        Row: {
          created_at: string
          id: string
          is_from_gps: boolean | null
          location_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_gps?: boolean | null
          location_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_gps?: boolean | null
          location_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_current_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      visit_reminders: {
        Row: {
          created_at: string | null
          id: string
          recommendation_id: string
          scheduled_for: string
          sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendation_id: string
          scheduled_for: string
          sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendation_id?: string
          scheduled_for?: string
          sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_reminders_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_reminders_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "view_business_commissions"
            referencedColumns: ["recommendation_id"]
          },
        ]
      }
    }
    Views: {
      view_business_commissions: {
        Row: {
          click_id: string | null
          clicked_at: string | null
          commission_paid: boolean | null
          commission_rate: number | null
          conversion_value: number | null
          converted: boolean | null
          place_id: string | null
          recommendation_id: string | null
          recommender_id: string | null
          recommender_name: string | null
          restaurant_address: string | null
          restaurant_name: string | null
          user_id: string | null
          visit_confirmed_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      bootstrap_first_admin: { Args: never; Returns: undefined }
      calculate_recommender_level: {
        Args: { total_points: number }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_ip_address: string
          p_max_attempts: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      get_request_results: {
        Args: { request_uuid: string }
        Returns: {
          confidence_score: number
          created_at: string
          notes: string
          recommendation_id: string
          recommender_name: string
          restaurant_name: string
        }[]
      }
      get_unpaid_commissions: {
        Args: { business_user_id: string }
        Returns: {
          click_id: string
          clicked_at: string
          commission_amount: number
          commission_rate: number
          conversion_value: number
          recommendation_id: string
          recommender_name: string
          visit_confirmed_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_rate_limit_attempt: {
        Args: { p_action_type: string; p_ip_address: string; p_user_id: string }
        Returns: undefined
      }
      self_assign_initial_roles: { Args: never; Returns: undefined }
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
