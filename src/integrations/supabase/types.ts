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
      account_locks: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          locked_at: string
          locked_until: string
          unlock_token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          locked_at?: string
          locked_until: string
          unlock_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          locked_at?: string
          locked_until?: string
          unlock_token?: string | null
        }
        Relationships: []
      }
      action_proposals: {
        Row: {
          action_label: string
          action_payload: Json
          action_type: string
          ai_reasoning: string | null
          auto_execute: boolean | null
          created_at: string
          executed_at: string | null
          executed_result: Json | null
          id: string
          source: string | null
          status: string
          telegram_notified: boolean | null
          updated_at: string
          user_id: string | null
          validation_notes: string | null
          workspace_id: string
        }
        Insert: {
          action_label: string
          action_payload: Json
          action_type: string
          ai_reasoning?: string | null
          auto_execute?: boolean | null
          created_at?: string
          executed_at?: string | null
          executed_result?: Json | null
          id?: string
          source?: string | null
          status?: string
          telegram_notified?: boolean | null
          updated_at?: string
          user_id?: string | null
          validation_notes?: string | null
          workspace_id: string
        }
        Update: {
          action_label?: string
          action_payload?: Json
          action_type?: string
          ai_reasoning?: string | null
          auto_execute?: boolean | null
          created_at?: string
          executed_at?: string | null
          executed_result?: Json | null
          id?: string
          source?: string | null
          status?: string
          telegram_notified?: boolean | null
          updated_at?: string
          user_id?: string | null
          validation_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          activity_type: string
          ai_metadata: Json | null
          ai_reviewed_at: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          is_ai_generated: boolean | null
          lead_id: string | null
          metadata: Json | null
          pending_ai_review: boolean | null
          project_id: string | null
          title: string | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          activity_type: string
          ai_metadata?: Json | null
          ai_reviewed_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_ai_generated?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          pending_ai_review?: boolean | null
          project_id?: string | null
          title?: string | null
          visibility?: string
          workspace_id?: string
        }
        Update: {
          activity_type?: string
          ai_metadata?: Json | null
          ai_reviewed_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_ai_generated?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          pending_ai_review?: boolean | null
          project_id?: string | null
          title?: string | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action_text: string
          artifact: Json | null
          artifact_generated_at: string | null
          artifact_model: string | null
          artifact_status: string | null
          artifact_type: string | null
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          impact_value: number | null
          reasoning: string | null
          signature: string
          snooze_until: string | null
          source: string
          status: string
          structured_updates: Json
          updated_at: string
          urgency: string | null
          user_id: string | null
          user_notes: Json
          workspace_id: string
        }
        Insert: {
          action_text: string
          artifact?: Json | null
          artifact_generated_at?: string | null
          artifact_model?: string | null
          artifact_status?: string | null
          artifact_type?: string | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          impact_value?: number | null
          reasoning?: string | null
          signature: string
          snooze_until?: string | null
          source: string
          status?: string
          structured_updates?: Json
          updated_at?: string
          urgency?: string | null
          user_id?: string | null
          user_notes?: Json
          workspace_id: string
        }
        Update: {
          action_text?: string
          artifact?: Json | null
          artifact_generated_at?: string | null
          artifact_model?: string | null
          artifact_status?: string | null
          artifact_type?: string | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          impact_value?: number | null
          reasoning?: string | null
          signature?: string
          snooze_until?: string | null
          source?: string
          status?: string
          structured_updates?: Json
          updated_at?: string
          urgency?: string | null
          user_id?: string | null
          user_notes?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      ai_agent_memory: {
        Row: {
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          importance_score: number | null
          memory_type: string
          metadata: Json | null
          session_id: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_type: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_type?: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          ai_metadata: Json | null
          comment: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          mode: string | null
          rating: number
          source_function: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          mode?: string | null
          rating: number
          source_function: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          ai_metadata?: Json | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          mode?: string | null
          rating?: number
          source_function?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          capabilities: string[] | null
          category: string
          context_window: number | null
          cost_per_1k_input: number | null
          cost_per_1k_output: number | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_default_for_category: boolean | null
          max_output_tokens: number | null
          model_id: string
          provider_name: string
        }
        Insert: {
          capabilities?: string[] | null
          category: string
          context_window?: number | null
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_default_for_category?: boolean | null
          max_output_tokens?: number | null
          model_id: string
          provider_name: string
        }
        Update: {
          capabilities?: string[] | null
          category?: string
          context_window?: number | null
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_default_for_category?: boolean | null
          max_output_tokens?: number | null
          model_id?: string
          provider_name?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          category: string
          created_at: string
          id: string
          model_config: Json
          name: string
          output_schema: Json | null
          slug: string
          system_prompt: string
          updated_at: string
          user_prompt: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          model_config?: Json
          name: string
          output_schema?: Json | null
          slug: string
          system_prompt: string
          updated_at?: string
          user_prompt?: string | null
          version?: number
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          model_config?: Json
          name?: string
          output_schema?: Json | null
          slug?: string
          system_prompt?: string
          updated_at?: string
          user_prompt?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_provider_config: {
        Row: {
          api_key_env_var: string
          base_url: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          priority: number
          provider_name: string
          rate_limit_rpm: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          api_key_env_var: string
          base_url: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          priority?: number
          provider_name: string
          rate_limit_rpm?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          api_key_env_var?: string
          base_url?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          priority?: number
          provider_name?: string
          rate_limit_rpm?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sentinel_alerts: {
        Row: {
          ai_metadata: Json | null
          category: string
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          workspace_id: string
        }
        Update: {
          ai_metadata?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_sentinel_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_metrics: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          estimated_cost_cents: number | null
          id: string
          input_tokens: number
          latency_ms: number | null
          metadata: Json | null
          model_id: string
          model_provider: string
          operation_type: string
          output_tokens: number
          prompt_slug: string | null
          success: boolean | null
          total_tokens: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json | null
          model_id: string
          model_provider: string
          operation_type: string
          output_tokens?: number
          prompt_slug?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json | null
          model_id?: string
          model_provider?: string
          operation_type?: string
          output_tokens?: number
          prompt_slug?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dismissals: {
        Row: {
          alert_id: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      api_pricing: {
        Row: {
          api_name: string
          cost_per_1k_input_tokens: number | null
          cost_per_1k_output_tokens: number | null
          cost_per_request_cents: number | null
          cost_per_unit_cents: number | null
          created_at: string | null
          currency: string | null
          effective_from: string | null
          effective_until: string | null
          free_tier_requests: number | null
          free_tier_tokens: number | null
          id: string
          is_active: boolean | null
          model_id: string | null
          provider_name: string
          updated_at: string | null
        }
        Insert: {
          api_name: string
          cost_per_1k_input_tokens?: number | null
          cost_per_1k_output_tokens?: number | null
          cost_per_request_cents?: number | null
          cost_per_unit_cents?: number | null
          created_at?: string | null
          currency?: string | null
          effective_from?: string | null
          effective_until?: string | null
          free_tier_requests?: number | null
          free_tier_tokens?: number | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          provider_name: string
          updated_at?: string | null
        }
        Update: {
          api_name?: string
          cost_per_1k_input_tokens?: number | null
          cost_per_1k_output_tokens?: number | null
          cost_per_request_cents?: number | null
          cost_per_unit_cents?: number | null
          created_at?: string | null
          currency?: string | null
          effective_from?: string | null
          effective_until?: string | null
          free_tier_requests?: number | null
          free_tier_tokens?: number | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          provider_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_quota_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          api_category: string | null
          api_name: string | null
          channels_notified: string[] | null
          created_at: string | null
          current_usage_percent: number
          current_value: number
          id: string
          limit_value: number
          metadata: Json | null
          metric_type: string
          notification_sent_at: string | null
          quota_id: string | null
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          api_category?: string | null
          api_name?: string | null
          channels_notified?: string[] | null
          created_at?: string | null
          current_usage_percent: number
          current_value: number
          id?: string
          limit_value: number
          metadata?: Json | null
          metric_type: string
          notification_sent_at?: string | null
          quota_id?: string | null
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          api_category?: string | null
          api_name?: string | null
          channels_notified?: string[] | null
          created_at?: string | null
          current_usage_percent?: number
          current_value?: number
          id?: string
          limit_value?: number
          metadata?: Json | null
          metric_type?: string
          notification_sent_at?: string | null
          quota_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_quota_alerts_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "api_quotas"
            referencedColumns: ["id"]
          },
        ]
      }
      api_quotas: {
        Row: {
          alert_channels: string[] | null
          alert_emails: string[] | null
          alert_threshold_critical: number | null
          alert_threshold_warning: number | null
          api_category: string | null
          api_name: string | null
          billing_entity_id: string | null
          block_at_limit: boolean | null
          created_at: string | null
          daily_requests_limit: number | null
          id: string
          is_active: boolean | null
          monthly_cost_limit_cents: number | null
          monthly_requests_limit: number | null
          monthly_tokens_limit: number | null
          priority: number | null
          provider_name: string | null
          requests_per_minute: number | null
          updated_at: string | null
          user_role: string | null
          workspace_id: string | null
        }
        Insert: {
          alert_channels?: string[] | null
          alert_emails?: string[] | null
          alert_threshold_critical?: number | null
          alert_threshold_warning?: number | null
          api_category?: string | null
          api_name?: string | null
          billing_entity_id?: string | null
          block_at_limit?: boolean | null
          created_at?: string | null
          daily_requests_limit?: number | null
          id?: string
          is_active?: boolean | null
          monthly_cost_limit_cents?: number | null
          monthly_requests_limit?: number | null
          monthly_tokens_limit?: number | null
          priority?: number | null
          provider_name?: string | null
          requests_per_minute?: number | null
          updated_at?: string | null
          user_role?: string | null
          workspace_id?: string | null
        }
        Update: {
          alert_channels?: string[] | null
          alert_emails?: string[] | null
          alert_threshold_critical?: number | null
          alert_threshold_warning?: number | null
          api_category?: string | null
          api_name?: string | null
          billing_entity_id?: string | null
          block_at_limit?: boolean | null
          created_at?: string | null
          daily_requests_limit?: number | null
          id?: string
          is_active?: boolean | null
          monthly_cost_limit_cents?: number | null
          monthly_requests_limit?: number | null
          monthly_tokens_limit?: number | null
          priority?: number | null
          provider_name?: string | null
          requests_per_minute?: number | null
          updated_at?: string | null
          user_role?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      api_usage_metrics: {
        Row: {
          api_category: string
          api_name: string
          billing_entity_id: string | null
          created_at: string
          currency: string | null
          entity_id: string | null
          entity_type: string | null
          error_code: string | null
          error_message: string | null
          estimated_cost_cents: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          metadata: Json | null
          model_id: string | null
          operation_type: string
          output_tokens: number | null
          provider_name: string
          request_count: number | null
          success: boolean | null
          total_tokens: number | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          api_category: string
          api_name: string
          billing_entity_id?: string | null
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model_id?: string | null
          operation_type: string
          output_tokens?: number | null
          provider_name: string
          request_count?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          api_category?: string
          api_name?: string
          billing_entity_id?: string | null
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model_id?: string | null
          operation_type?: string
          output_tokens?: number | null
          provider_name?: string
          request_count?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_categories_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      article_versions: {
        Row: {
          article_id: string
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          slug: string
          title: string
          version_number: number
        }
        Insert: {
          article_id: string
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          slug: string
          title: string
          version_number: number
        }
        Update: {
          article_id?: string
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          slug?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_views: {
        Row: {
          article_id: string
          id: string
          viewed_at: string
        }
        Insert: {
          article_id: string
          id?: string
          viewed_at?: string
        }
        Update: {
          article_id?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          actualite_type: string | null
          ai_documents_summary: string | null
          ai_source: string | null
          author: string | null
          author_id: string | null
          certificat_delivre: boolean | null
          compteur_telechargements: number | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          cta_evenement_personnalise: string | null
          cta_personnalise: string | null
          documents_telechargeables: Json | null
          duree_heures: number | null
          event_date: string | null
          event_location: string | null
          excerpt: string | null
          faq: Json | null
          file_url: string | null
          format_fichier: string | null
          heure_debut: string | null
          id: string
          intervenants: Json | null
          langues_disponibles: string[] | null
          max_participants: number | null
          meta_description: string | null
          meta_title: string | null
          niveau: string | null
          nombre_pages: number | null
          outils_requis: string[] | null
          prerequis: string | null
          problematique: string | null
          programme_detaille: Json | null
          published: boolean | null
          published_at: string | null
          rappels_automatiques: boolean | null
          registration_open: boolean | null
          related_solution_slug: string | null
          replay_url: string | null
          resource_type: string
          ressources_complementaires: Json | null
          scheduled_publish_at: string | null
          secteur_activite: string | null
          show_participants_count: boolean | null
          slug: string
          sondage_post_evenement_url: string | null
          source_externe: Json | null
          status: string | null
          synthesis_stale: boolean | null
          tags: string[] | null
          taille_entreprise: string | null
          taille_fichier_bytes: number | null
          thematiques: string[] | null
          title: string
          type_evenement: string | null
          updated_at: string | null
          version_document: string | null
        }
        Insert: {
          actualite_type?: string | null
          ai_documents_summary?: string | null
          ai_source?: string | null
          author?: string | null
          author_id?: string | null
          certificat_delivre?: boolean | null
          compteur_telechargements?: number | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          cta_evenement_personnalise?: string | null
          cta_personnalise?: string | null
          documents_telechargeables?: Json | null
          duree_heures?: number | null
          event_date?: string | null
          event_location?: string | null
          excerpt?: string | null
          faq?: Json | null
          file_url?: string | null
          format_fichier?: string | null
          heure_debut?: string | null
          id?: string
          intervenants?: Json | null
          langues_disponibles?: string[] | null
          max_participants?: number | null
          meta_description?: string | null
          meta_title?: string | null
          niveau?: string | null
          nombre_pages?: number | null
          outils_requis?: string[] | null
          prerequis?: string | null
          problematique?: string | null
          programme_detaille?: Json | null
          published?: boolean | null
          published_at?: string | null
          rappels_automatiques?: boolean | null
          registration_open?: boolean | null
          related_solution_slug?: string | null
          replay_url?: string | null
          resource_type?: string
          ressources_complementaires?: Json | null
          scheduled_publish_at?: string | null
          secteur_activite?: string | null
          show_participants_count?: boolean | null
          slug: string
          sondage_post_evenement_url?: string | null
          source_externe?: Json | null
          status?: string | null
          synthesis_stale?: boolean | null
          tags?: string[] | null
          taille_entreprise?: string | null
          taille_fichier_bytes?: number | null
          thematiques?: string[] | null
          title: string
          type_evenement?: string | null
          updated_at?: string | null
          version_document?: string | null
        }
        Update: {
          actualite_type?: string | null
          ai_documents_summary?: string | null
          ai_source?: string | null
          author?: string | null
          author_id?: string | null
          certificat_delivre?: boolean | null
          compteur_telechargements?: number | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          cta_evenement_personnalise?: string | null
          cta_personnalise?: string | null
          documents_telechargeables?: Json | null
          duree_heures?: number | null
          event_date?: string | null
          event_location?: string | null
          excerpt?: string | null
          faq?: Json | null
          file_url?: string | null
          format_fichier?: string | null
          heure_debut?: string | null
          id?: string
          intervenants?: Json | null
          langues_disponibles?: string[] | null
          max_participants?: number | null
          meta_description?: string | null
          meta_title?: string | null
          niveau?: string | null
          nombre_pages?: number | null
          outils_requis?: string[] | null
          prerequis?: string | null
          problematique?: string | null
          programme_detaille?: Json | null
          published?: boolean | null
          published_at?: string | null
          rappels_automatiques?: boolean | null
          registration_open?: boolean | null
          related_solution_slug?: string | null
          replay_url?: string | null
          resource_type?: string
          ressources_complementaires?: Json | null
          scheduled_publish_at?: string | null
          secteur_activite?: string | null
          show_participants_count?: boolean | null
          slug?: string
          sondage_post_evenement_url?: string | null
          source_externe?: Json | null
          status?: string | null
          synthesis_stale?: boolean | null
          tags?: string[] | null
          taille_entreprise?: string | null
          taille_fichier_bytes?: number | null
          thematiques?: string[] | null
          title?: string
          type_evenement?: string | null
          updated_at?: string | null
          version_document?: string | null
        }
        Relationships: []
      }
      atelier_inscriptions: {
        Row: {
          atelier_id: string
          created_at: string | null
          id: string
          lead_id: string
        }
        Insert: {
          atelier_id: string
          created_at?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          atelier_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atelier_inscriptions_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_inscriptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_entities: {
        Row: {
          address: string | null
          capital_amount: number | null
          cgv_template_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          current_quote_sequence: number | null
          default_payment_terms: Json | null
          default_tva_rate: number | null
          default_validity_days: number | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          legal_form: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          primary_color: string | null
          quote_format: string | null
          quote_prefix: string | null
          quote_sequence_start: number | null
          rcs_city: string | null
          siren: string | null
          tva_number: string | null
          updated_at: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          capital_amount?: number | null
          cgv_template_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          current_quote_sequence?: number | null
          default_payment_terms?: Json | null
          default_tva_rate?: number | null
          default_validity_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          quote_format?: string | null
          quote_prefix?: string | null
          quote_sequence_start?: number | null
          rcs_city?: string | null
          siren?: string | null
          tva_number?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          capital_amount?: number | null
          cgv_template_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          current_quote_sequence?: number | null
          default_payment_terms?: Json | null
          default_tva_rate?: number | null
          default_validity_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          quote_format?: string | null
          quote_prefix?: string | null
          quote_sequence_start?: number | null
          rcs_city?: string | null
          siren?: string | null
          tva_number?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_entities_cgv_template_fkey"
            columns: ["cgv_template_id"]
            isOneToOne: false
            referencedRelation: "cgv_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_availability: {
        Row: {
          booking_type_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
        }
        Insert: {
          booking_type_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
        }
        Update: {
          booking_type_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_booking_type_id_fkey"
            columns: ["booking_type_id"]
            isOneToOne: false
            referencedRelation: "booking_types"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_partners: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          partner_id: string
          role: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          partner_id: string
          role?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          partner_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_partners_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_types: {
        Row: {
          buffer_minutes: number | null
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          additional_guests: string[] | null
          booking_type_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company: string | null
          created_at: string
          email: string
          end_time: string
          google_event_id: string | null
          google_meet_link: string | null
          id: string
          lead_id: string | null
          meeting_type: string | null
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          start_time: string
          status: string
          updated_at: string
          workspace_id: string
          zoom_join_url: string | null
          zoom_meeting_id: string | null
        }
        Insert: {
          additional_guests?: string[] | null
          booking_type_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company?: string | null
          created_at?: string
          email: string
          end_time: string
          google_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          lead_id?: string | null
          meeting_type?: string | null
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          start_time: string
          status?: string
          updated_at?: string
          workspace_id?: string
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
        }
        Update: {
          additional_guests?: string[] | null
          booking_type_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company?: string | null
          created_at?: string
          email?: string
          end_time?: string
          google_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          lead_id?: string | null
          meeting_type?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          workspace_id?: string
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_type_id_fkey"
            columns: ["booking_type_id"]
            isOneToOne: false
            referencedRelation: "booking_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      brochures: {
        Row: {
          cover_image_url: string | null
          cover_subtitle: string | null
          cover_title: string
          created_at: string | null
          custom_colors: Json | null
          export_settings: Json | null
          id: string
          published: boolean | null
          sections: Json
          slug: string
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          cover_image_url?: string | null
          cover_subtitle?: string | null
          cover_title: string
          created_at?: string | null
          custom_colors?: Json | null
          export_settings?: Json | null
          id?: string
          published?: boolean | null
          sections?: Json
          slug: string
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          cover_image_url?: string | null
          cover_subtitle?: string | null
          cover_title?: string
          created_at?: string | null
          custom_colors?: Json | null
          export_settings?: Json | null
          id?: string
          published?: boolean | null
          sections?: Json
          slug?: string
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cgv_templates: {
        Row: {
          content_html: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          slug: string
          updated_at: string | null
          version: string | null
          workspace_id: string | null
        }
        Insert: {
          content_html: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string | null
        }
        Update: {
          content_html?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      cockpit_auth_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          ip_hash: string | null
          mfa_method: string | null
          stepup_reason: string | null
          ua_hash: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          ip_hash?: string | null
          mfa_method?: string | null
          stepup_reason?: string | null
          ua_hash?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          ip_hash?: string | null
          mfa_method?: string | null
          stepup_reason?: string | null
          ua_hash?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      cockpit_mfa_attempts: {
        Row: {
          attempted_at: string | null
          failure_reason: string | null
          id: string
          ip_hash: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_hash?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          approved: boolean
          article_id: string
          author_email: string
          author_name: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          article_id: string
          author_email: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          article_id?: string
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          labs_status: string | null
          message: string
          name: string
          source: string | null
          source_context: string | null
          subject: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          labs_status?: string | null
          message: string
          name: string
          source?: string | null
          source_context?: string | null
          subject: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          labs_status?: string | null
          message?: string
          name?: string
          source?: string | null
          source_context?: string | null
          subject?: string
        }
        Relationships: []
      }
      cta_clicks: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          cta_name: string
          id: string
          referrer: string | null
          source_context: string | null
          source_page: string
          user_session: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          cta_name: string
          id?: string
          referrer?: string | null
          source_context?: string | null
          source_page: string
          user_session?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          cta_name?: string
          id?: string
          referrer?: string | null
          source_context?: string | null
          source_page?: string
          user_session?: string | null
        }
        Relationships: []
      }
      daily_intelligence: {
        Row: {
          consulte_count: number | null
          created_at: string | null
          generated_at: string | null
          generated_date: string
          generation_ms: number | null
          id: string
          intelligence: Json
          llm_model: string | null
          raw_data: Json | null
          workspace_id: string
        }
        Insert: {
          consulte_count?: number | null
          created_at?: string | null
          generated_at?: string | null
          generated_date?: string
          generation_ms?: number | null
          id?: string
          intelligence: Json
          llm_model?: string | null
          raw_data?: Json | null
          workspace_id: string
        }
        Update: {
          consulte_count?: number | null
          created_at?: string | null
          generated_at?: string | null
          generated_date?: string
          generation_ms?: number | null
          id?: string
          intelligence?: Json
          llm_model?: string | null
          raw_data?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_intelligence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      database_backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_table: string | null
          error_message: string | null
          execution_logs: Json | null
          file_size_bytes: number | null
          id: string
          integrity_check_at: string | null
          integrity_check_status: string | null
          progress_percentage: number | null
          restoration_possible: boolean | null
          started_at: string
          status: string
          tables_backed_up: string[] | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_table?: string | null
          error_message?: string | null
          execution_logs?: Json | null
          file_size_bytes?: number | null
          id?: string
          integrity_check_at?: string | null
          integrity_check_status?: string | null
          progress_percentage?: number | null
          restoration_possible?: boolean | null
          started_at?: string
          status?: string
          tables_backed_up?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_table?: string | null
          error_message?: string | null
          execution_logs?: Json | null
          file_size_bytes?: number | null
          id?: string
          integrity_check_at?: string | null
          integrity_check_status?: string | null
          progress_percentage?: number | null
          restoration_possible?: boolean | null
          started_at?: string
          status?: string
          tables_backed_up?: string[] | null
        }
        Relationships: []
      }
      document_partners: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          partner_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          partner_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          partner_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_partners_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_model_config: {
        Row: {
          created_at: string
          function_name: string
          id: string
          is_custom_model: boolean | null
          model_id: string | null
          provider_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          is_custom_model?: boolean | null
          model_id?: string | null
          provider_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          is_custom_model?: boolean | null
          model_id?: string | null
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_configurations: {
        Row: {
          admin_email_subject: string | null
          admin_email_template: string | null
          admin_emails: string[] | null
          created_at: string
          id: string
          is_active: boolean
          send_admin_notification: boolean
          send_user_confirmation: boolean
          source_id: string | null
          source_type: string
          updated_at: string
          user_email_subject: string | null
          user_email_template: string | null
        }
        Insert: {
          admin_email_subject?: string | null
          admin_email_template?: string | null
          admin_emails?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          send_admin_notification?: boolean
          send_user_confirmation?: boolean
          source_id?: string | null
          source_type: string
          updated_at?: string
          user_email_subject?: string | null
          user_email_template?: string | null
        }
        Update: {
          admin_email_subject?: string | null
          admin_email_template?: string | null
          admin_emails?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          send_admin_notification?: boolean
          send_user_confirmation?: boolean
          source_id?: string | null
          source_type?: string
          updated_at?: string
          user_email_subject?: string | null
          user_email_template?: string | null
        }
        Relationships: []
      }
      email_domains: {
        Row: {
          created_at: string | null
          daily_sent_count: number | null
          dkim_valid: boolean | null
          dmarc_valid: boolean | null
          domain: string
          domain_type: string
          from_email: string
          from_name: string
          id: string
          is_active: boolean | null
          last_dns_check: string | null
          last_reset_date: string | null
          last_sent_at: string | null
          provider: string
          reply_to: string | null
          spf_valid: boolean | null
          updated_at: string | null
          warmup_daily_limit: number | null
          warmup_day: number | null
          warmup_started_at: string | null
          warmup_status: string | null
        }
        Insert: {
          created_at?: string | null
          daily_sent_count?: number | null
          dkim_valid?: boolean | null
          dmarc_valid?: boolean | null
          domain: string
          domain_type: string
          from_email: string
          from_name: string
          id?: string
          is_active?: boolean | null
          last_dns_check?: string | null
          last_reset_date?: string | null
          last_sent_at?: string | null
          provider: string
          reply_to?: string | null
          spf_valid?: boolean | null
          updated_at?: string | null
          warmup_daily_limit?: number | null
          warmup_day?: number | null
          warmup_started_at?: string | null
          warmup_status?: string | null
        }
        Update: {
          created_at?: string | null
          daily_sent_count?: number | null
          dkim_valid?: boolean | null
          dmarc_valid?: boolean | null
          domain?: string
          domain_type?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean | null
          last_dns_check?: string | null
          last_reset_date?: string | null
          last_sent_at?: string | null
          provider?: string
          reply_to?: string | null
          spf_valid?: boolean | null
          updated_at?: string | null
          warmup_daily_limit?: number | null
          warmup_day?: number | null
          warmup_started_at?: string | null
          warmup_status?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          sent_at: string | null
          source_id: string | null
          source_type: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          sent_at?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      entity_context_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_context_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_name_references: {
        Row: {
          confidence_score: number | null
          context: string | null
          created_at: string | null
          detected_by: string | null
          id: string
          reference_type: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          detected_by?: string | null
          id?: string
          reference_type?: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          detected_by?: string | null
          id?: string
          reference_type?: string
          source_entity_id?: string
          source_entity_type?: string
          target_entity_id?: string
          target_entity_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      entity_vocabulary: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          term: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          term: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          term?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_vocabulary_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          article_id: string
          auto_suggested: boolean | null
          created_at: string | null
          id: string
          questions: Json
          suggestion_source: string | null
          updated_at: string | null
        }
        Insert: {
          article_id: string
          auto_suggested?: boolean | null
          created_at?: string | null
          id?: string
          questions: Json
          suggestion_source?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string
          auto_suggested?: boolean | null
          created_at?: string | null
          id?: string
          questions?: Json
          suggestion_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          field_id: string | null
          form_id: string
          id: string
          session_id: string | null
          step: number | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          field_id?: string | null
          form_id: string
          id?: string
          session_id?: string | null
          step?: number | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          field_id?: string | null
          form_id?: string
          id?: string
          session_id?: string | null
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_analytics_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_analytics_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          data: Json
          form_id: string
          id: string
          is_complete: boolean | null
          metadata: Json | null
          partial_data: Json | null
          submitted_at: string | null
        }
        Insert: {
          data: Json
          form_id: string
          id?: string
          is_complete?: boolean | null
          metadata?: Json | null
          partial_data?: Json | null
          submitted_at?: string | null
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          is_complete?: boolean | null
          metadata?: Json | null
          partial_data?: Json | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          article_id: string | null
          created_at: string | null
          description: string | null
          fields: Json | null
          id: string
          is_active: boolean | null
          qr_code_url: string | null
          settings: Json | null
          slug: string
          submissions_count: number | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          settings?: Json | null
          slug: string
          submissions_count?: number | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          settings?: Json | null
          slug?: string
          submissions_count?: number | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          ai_documents_summary: string | null
          ai_generated: boolean | null
          ai_metadata: Json | null
          approved_at: string | null
          approved_by: string | null
          article_id: string | null
          billing_entity_id: string | null
          content_json: Json
          created_at: string | null
          created_by: string | null
          document_type: string
          id: string
          lead_id: string | null
          opportunity_id: string | null
          output_format: string | null
          output_storage_path: string | null
          project_id: string | null
          quote_metadata: Json | null
          quote_number: string | null
          sent_at: string | null
          sent_to: string | null
          slug: string | null
          specification_id: string | null
          status: string
          supersedes_document_id: string | null
          synthesis_stale: boolean | null
          title: string
          updated_at: string | null
          version: string | null
          workspace_id: string
        }
        Insert: {
          ai_documents_summary?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          article_id?: string | null
          billing_entity_id?: string | null
          content_json?: Json
          created_at?: string | null
          created_by?: string | null
          document_type: string
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          output_format?: string | null
          output_storage_path?: string | null
          project_id?: string | null
          quote_metadata?: Json | null
          quote_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
          slug?: string | null
          specification_id?: string | null
          status?: string
          supersedes_document_id?: string | null
          synthesis_stale?: boolean | null
          title: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string
        }
        Update: {
          ai_documents_summary?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          article_id?: string | null
          billing_entity_id?: string | null
          content_json?: Json
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          output_format?: string | null
          output_storage_path?: string | null
          project_id?: string | null
          quote_metadata?: Json | null
          quote_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
          slug?: string | null
          specification_id?: string | null
          status?: string
          supersedes_document_id?: string | null
          synthesis_stale?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_billing_entity_id_fkey"
            columns: ["billing_entity_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          email_restriction: string | null
          expires_at: string | null
          id: string
          max_uses: number
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          email_restriction?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          email_restriction?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          uses_count?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid_cents: number | null
          amount_total_cents: number | null
          created_at: string
          currency: string
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_paid_cents?: number | null
          amount_total_cents?: number | null
          created_at?: string
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_paid_cents?: number | null
          amount_total_cents?: number | null
          created_at?: string
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_alias_suggestions: {
        Row: {
          confidence_score: number | null
          context_snippet: string | null
          context_type: string | null
          created_alias_id: string | null
          created_at: string | null
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_type: string
          status: string | null
          suggested_alias: string
          suggested_canonical: string | null
          workspace_id: string
        }
        Insert: {
          confidence_score?: number | null
          context_snippet?: string | null
          context_type?: string | null
          created_alias_id?: string | null
          created_at?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type: string
          status?: string | null
          suggested_alias: string
          suggested_canonical?: string | null
          workspace_id: string
        }
        Update: {
          confidence_score?: number | null
          context_snippet?: string | null
          context_type?: string | null
          created_alias_id?: string | null
          created_at?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string
          status?: string | null
          suggested_alias?: string
          suggested_canonical?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_alias_suggestions_created_alias_id_fkey"
            columns: ["created_alias_id"]
            isOneToOne: false
            referencedRelation: "keyword_aliases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyword_alias_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_aliases: {
        Row: {
          alias: string
          canonical_name: string
          context_type: string
          created_at: string | null
          created_by: string | null
          detected_count: number
          first_detected_at: string | null
          id: string
          is_active: boolean | null
          phonetic_key: string | null
          source_examples: Json | null
          status: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          alias: string
          canonical_name: string
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          detected_count?: number
          first_detected_at?: string | null
          id?: string
          is_active?: boolean | null
          phonetic_key?: string | null
          source_examples?: Json | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          alias?: string
          canonical_name?: string
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          detected_count?: number
          first_detected_at?: string | null
          id?: string
          is_active?: boolean | null
          phonetic_key?: string | null
          source_examples?: Json | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      keyword_synonyms: {
        Row: {
          canonical_term: string
          confidence: number | null
          context_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          phonetic_key: string | null
          relation_type: string
          synonym: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          workspace_id: string
        }
        Insert: {
          canonical_term: string
          confidence?: number | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          phonetic_key?: string | null
          relation_type?: string
          synonym: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id: string
        }
        Update: {
          canonical_term?: string
          confidence?: number | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          phonetic_key?: string | null
          relation_type?: string
          synonym?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_synonyms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          lead_id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          lead_id: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          lead_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_partners: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          partner_id: string
          role: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          partner_id: string
          role?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          partner_id?: string
          role?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_partners_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          ai_documents_summary: string | null
          ai_metadata: Json | null
          budget: number | null
          city: string | null
          company: string | null
          company_size: string | null
          consent_marketing: boolean | null
          country: string | null
          created_at: string | null
          created_by_partner_id: string | null
          email: string
          familiarity_details: Json | null
          familiarity_score: number | null
          id: string
          industry: string | null
          last_contacted_at: string | null
          lead_score: number | null
          lead_score_details: Json | null
          linkedin_url: string | null
          message: string | null
          name: string
          phone: string | null
          position: string | null
          postal_code: string | null
          qualification_status: string | null
          siret: string | null
          slug: string | null
          source: string
          source_context: string | null
          source_id: string | null
          status: string | null
          synthesis_stale: boolean | null
          updated_at: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          budget?: number | null
          city?: string | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          country?: string | null
          created_at?: string | null
          created_by_partner_id?: string | null
          email: string
          familiarity_details?: Json | null
          familiarity_score?: number | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_score_details?: Json | null
          linkedin_url?: string | null
          message?: string | null
          name: string
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          qualification_status?: string | null
          siret?: string | null
          slug?: string | null
          source: string
          source_context?: string | null
          source_id?: string | null
          status?: string | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string
        }
        Update: {
          address?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          budget?: number | null
          city?: string | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          country?: string | null
          created_at?: string | null
          created_by_partner_id?: string | null
          email?: string
          familiarity_details?: Json | null
          familiarity_score?: number | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_score_details?: Json | null
          linkedin_url?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          qualification_status?: string | null
          siret?: string | null
          slug?: string | null
          source?: string
          source_context?: string | null
          source_id?: string | null
          status?: string | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_partner_id_fkey"
            columns: ["created_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_models: {
        Row: {
          category: string
          cost_tier: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          max_tokens: number | null
          model_id: string
          provider: string
          sort_order: number | null
          supports_tools: boolean | null
          supports_vision: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          cost_tier?: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id: string
          provider: string
          sort_order?: number | null
          supports_tools?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          cost_tier?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id?: string
          provider?: string
          sort_order?: number | null
          supports_tools?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address: unknown
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      mcp_api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_request_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: number | null
          error_message: string | null
          id: string
          key_id: string | null
          status: string
          tool_name: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: number | null
          error_message?: string | null
          id?: string
          key_id?: string | null
          status: string
          tool_name?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: number | null
          error_message?: string | null
          id?: string
          key_id?: string | null
          status?: string
          tool_name?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      media_templates: {
        Row: {
          created_at: string
          editor_type: string
          id: string
          name: string
          template_data: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          editor_type: string
          id?: string
          name: string
          template_data: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          editor_type?: string
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          action_items: Json | null
          ai_metadata: Json | null
          ai_summary: string | null
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          id: string
          next_steps: string | null
          notes: string | null
          objectives: string | null
          opportunity_id: string | null
          project_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          action_items?: Json | null
          ai_metadata?: Json | null
          ai_summary?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          next_steps?: string | null
          notes?: string | null
          objectives?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          action_items?: Json | null
          ai_metadata?: Json | null
          ai_summary?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          next_steps?: string | null
          notes?: string | null
          objectives?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          ai_metadata: Json | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          expected_close_date: string | null
          expected_revenue: number | null
          id: string
          lead_id: string | null
          probability: number | null
          source: string | null
          stage: string
          stage_entered_at: string | null
          title: string
          updated_at: string | null
          value_amount: number | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_revenue?: number | null
          id?: string
          lead_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          stage_entered_at?: string | null
          title: string
          updated_at?: string | null
          value_amount?: number | null
          workspace_id?: string
        }
        Update: {
          ai_metadata?: Json | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_revenue?: number | null
          id?: string
          lead_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          stage_entered_at?: string | null
          title?: string
          updated_at?: string | null
          value_amount?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_partners: {
        Row: {
          created_at: string | null
          id: string
          opportunity_id: string
          partner_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          opportunity_id: string
          partner_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          opportunity_id?: string
          partner_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_partners_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profile: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          primary_company_id: string | null
          role_label: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          primary_company_id?: string | null
          role_label?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          primary_company_id?: string | null
          role_label?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_profile_primary_company_id_fkey"
            columns: ["primary_company_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_profile_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          content: string
          id: string
          page_slug: string
          section_key: string
          updated_at: string | null
        }
        Insert: {
          content?: string
          id?: string
          page_slug: string
          section_key: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          id?: string
          page_slug?: string
          section_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      participant_entity_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_used_at: string
          linked_entity_id: string
          linked_entity_name: string | null
          linked_entity_type: string
          participant_name: string
          usage_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string
          linked_entity_id: string
          linked_entity_name?: string | null
          linked_entity_type: string
          participant_name: string
          usage_count?: number
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string
          linked_entity_id?: string
          linked_entity_name?: string | null
          linked_entity_type?: string
          participant_name?: string
          usage_count?: number
          workspace_id?: string
        }
        Relationships: []
      }
      partner_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_comments: {
        Row: {
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          partner_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          partner_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_comments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_digests: {
        Row: {
          content: Json
          created_at: string
          id: string
          partner_id: string | null
          sent_at: string | null
          week_start: string
          workspace_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          partner_id?: string | null
          sent_at?: string | null
          week_start: string
          workspace_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          partner_id?: string | null
          sent_at?: string | null
          week_start?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_digests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_digests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          lead_id: string | null
          mime_type: string | null
          partner_id: string
          project_id: string | null
          status: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          partner_id: string
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          partner_id?: string
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          partner_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          partner_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          partner_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_login_history: {
        Row: {
          device_type: string | null
          id: string
          ip_address: string | null
          logged_in_at: string
          logout_at: string | null
          partner_id: string
          session_duration_minutes: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          logout_at?: string | null
          partner_id: string
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          logout_at?: string | null
          partner_id?: string
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_login_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          partner_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          partner_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          partner_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_solution_interests: {
        Row: {
          client_company: string | null
          client_email: string | null
          client_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          partner_id: string
          solution_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          solution_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          solution_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_solution_interests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_solution_interests_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_time_entries: {
        Row: {
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          lead_id: string | null
          partner_id: string
          project_id: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          hours: number
          id?: string
          lead_id?: string | null
          partner_id: string
          project_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          lead_id?: string | null
          partner_id?: string
          project_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_time_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_time_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          ai_documents_summary: string | null
          avatar_url: string | null
          bio: string | null
          commission_rate: number | null
          company: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          expertise: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          linkedin_url: string | null
          login_count: number | null
          name: string
          partner_subtype: string | null
          partner_type: string
          phone: string | null
          scope: Json
          slug: string
          specialties: string[] | null
          status: string
          suspended_at: string | null
          synthesis_stale: boolean | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          ai_documents_summary?: string | null
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          expertise?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          linkedin_url?: string | null
          login_count?: number | null
          name: string
          partner_subtype?: string | null
          partner_type: string
          phone?: string | null
          scope?: Json
          slug: string
          specialties?: string[] | null
          status?: string
          suspended_at?: string | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          workspace_id?: string
        }
        Update: {
          ai_documents_summary?: string | null
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          expertise?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          linkedin_url?: string | null
          login_count?: number | null
          name?: string
          partner_subtype?: string | null
          partner_type?: string
          phone?: string | null
          scope?: Json
          slug?: string
          specialties?: string[] | null
          status?: string
          suspended_at?: string | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          accessibility_score: number | null
          best_practices_score: number | null
          bundle_size_css: number | null
          bundle_size_js: number | null
          bundle_size_total: number | null
          cls: number | null
          created_at: string
          environment: string | null
          fcp: number | null
          id: string
          lcp: number | null
          notes: string | null
          performance_score: number | null
          recorded_at: string
          recorded_by: string | null
          seo_score: number | null
          tbt: number | null
          tti: number | null
        }
        Insert: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          bundle_size_css?: number | null
          bundle_size_js?: number | null
          bundle_size_total?: number | null
          cls?: number | null
          created_at?: string
          environment?: string | null
          fcp?: number | null
          id?: string
          lcp?: number | null
          notes?: string | null
          performance_score?: number | null
          recorded_at?: string
          recorded_by?: string | null
          seo_score?: number | null
          tbt?: number | null
          tti?: number | null
        }
        Update: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          bundle_size_css?: number | null
          bundle_size_js?: number | null
          bundle_size_total?: number | null
          cls?: number | null
          created_at?: string
          environment?: string | null
          fcp?: number | null
          id?: string
          lcp?: number | null
          notes?: string | null
          performance_score?: number | null
          recorded_at?: string
          recorded_by?: string | null
          seo_score?: number | null
          tbt?: number | null
          tti?: number | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          limits: Json
          name: string
          price_monthly_eur: number
          slug: string
          stripe_price_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          name: string
          price_monthly_eur?: number
          slug: string
          stripe_price_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          name?: string
          price_monthly_eur?: number
          slug?: string
          stripe_price_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          onboarded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          onboarded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          onboarded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_contacts: {
        Row: {
          lead_id: string
          project_id: string
          role: string
        }
        Insert: {
          lead_id: string
          project_id: string
          role?: string
        }
        Update: {
          lead_id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string
          project_id: string
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name: string
          project_id: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string
          project_id?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          note_type: string | null
          project_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          project_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          project_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_partners: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          project_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          project_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          ai_documents_summary: string | null
          ai_metadata: Json | null
          assigned_to: string | null
          budget_amount: number | null
          consumed_amount: number | null
          created_at: string | null
          created_by_partner_id: string | null
          description: string | null
          health_status: string
          id: string
          lead_id: string | null
          name: string
          opportunity_id: string | null
          planned_end_date: string | null
          solution_id: string | null
          start_date: string | null
          status: string
          synthesis_stale: boolean | null
          target_end_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          actual_end_date?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          assigned_to?: string | null
          budget_amount?: number | null
          consumed_amount?: number | null
          created_at?: string | null
          created_by_partner_id?: string | null
          description?: string | null
          health_status?: string
          id?: string
          lead_id?: string | null
          name: string
          opportunity_id?: string | null
          planned_end_date?: string | null
          solution_id?: string | null
          start_date?: string | null
          status?: string
          synthesis_stale?: boolean | null
          target_end_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          actual_end_date?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          assigned_to?: string | null
          budget_amount?: number | null
          consumed_amount?: number | null
          created_at?: string | null
          created_by_partner_id?: string | null
          description?: string | null
          health_status?: string
          id?: string
          lead_id?: string | null
          name?: string
          opportunity_id?: string | null
          planned_end_date?: string | null
          solution_id?: string | null
          start_date?: string | null
          status?: string
          synthesis_stale?: boolean | null
          target_end_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_partner_id_fkey"
            columns: ["created_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_numbers: {
        Row: {
          billing_entity_id: string
          created_at: string | null
          document_id: string | null
          id: string
          month: number | null
          quote_number: string
          sequence: number
          year: number
        }
        Insert: {
          billing_entity_id: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          month?: number | null
          quote_number: string
          sequence: number
          year: number
        }
        Update: {
          billing_entity_id?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          month?: number | null
          quote_number?: string
          sequence?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_numbers_billing_entity_id_fkey"
            columns: ["billing_entity_id"]
            isOneToOne: false
            referencedRelation: "billing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_numbers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_requests: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      resource_embeddings: {
        Row: {
          chunk_index: number
          content_chunk: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          resource_id: string
          resource_slug: string
          resource_title: string
          resource_type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          chunk_index?: number
          content_chunk: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          resource_id: string
          resource_slug: string
          resource_title: string
          resource_type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          chunk_index?: number
          content_chunk?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string
          resource_slug?: string
          resource_title?: string
          resource_type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_embeddings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          created_at: string | null
          id: string
          page_context: string | null
          query: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_context?: string | null
          query: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_context?: string | null
          query?: string
        }
        Relationships: []
      }
      sentinel_trigger_queue: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          processed_at: string | null
          trigger_source: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          processed_at?: string | null
          trigger_source: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          processed_at?: string | null
          trigger_source?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_trigger_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_leads: {
        Row: {
          created_at: string | null
          id: string
          interest_level: string | null
          lead_id: string
          notes: string | null
          solution_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id: string
          notes?: string | null
          solution_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id?: string
          notes?: string | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_leads_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_partners: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          role: string | null
          solution_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          role?: string | null
          solution_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          role?: string | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_partners_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      specifications: {
        Row: {
          ai_generated: boolean | null
          ai_metadata: Json | null
          approved_at: string | null
          approved_by: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          project_id: string | null
          solution_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          version: string | null
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          solution_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          solution_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          allowed_transitions: Json | null
          code: string
          created_at: string | null
          display_order: number | null
          entity_type: string
          id: string
          is_default: boolean | null
          is_terminal: boolean | null
          label: string
          ui_variant: string | null
        }
        Insert: {
          allowed_transitions?: Json | null
          code: string
          created_at?: string | null
          display_order?: number | null
          entity_type: string
          id?: string
          is_default?: boolean | null
          is_terminal?: boolean | null
          label: string
          ui_variant?: string | null
        }
        Update: {
          allowed_transitions?: Json | null
          code?: string
          created_at?: string | null
          display_order?: number | null
          entity_type?: string
          id?: string
          is_default?: boolean | null
          is_terminal?: boolean | null
          label?: string
          ui_variant?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          processed_at: string | null
          stripe_event_id: string
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          stripe_event_id: string
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          stripe_event_id?: string
          type?: string
        }
        Relationships: []
      }
      subscription_changes: {
        Row: {
          change_type: string
          created_at: string
          from_plan_slug: string | null
          id: string
          metadata: Json
          stripe_event_id: string | null
          subscription_id: string | null
          to_plan_slug: string | null
          workspace_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          from_plan_slug?: string | null
          id?: string
          metadata?: Json
          stripe_event_id?: string | null
          subscription_id?: string | null
          to_plan_slug?: string | null
          workspace_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          from_plan_slug?: string | null
          id?: string
          metadata?: Json
          stripe_event_id?: string | null
          subscription_id?: string | null
          to_plan_slug?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_changes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_changes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      task_partners: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          role: string | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          role?: string | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          role?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_partners_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_generated: boolean | null
          ai_metadata: Json | null
          ai_suggested_action: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          entity_id: string | null
          entity_type: string | null
          google_event_id: string | null
          id: string
          lead_id: string | null
          meeting_note_id: string | null
          opportunity_id: string | null
          priority: string
          project_id: string | null
          snoozed_until: string | null
          status: string
          task_type: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_suggested_action?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          entity_id?: string | null
          entity_type?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          meeting_note_id?: string | null
          opportunity_id?: string | null
          priority?: string
          project_id?: string | null
          snoozed_until?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_suggested_action?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          entity_id?: string | null
          entity_type?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          meeting_note_id?: string | null
          opportunity_id?: string | null
          priority?: string
          project_id?: string | null
          snoozed_until?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_conversation_context: {
        Row: {
          active_entity_id: string | null
          active_entity_type: string | null
          chat_id: number
          collected_info: Json | null
          content: string
          created_at: string
          expires_at: string
          id: string
          role: string
          user_id: number
        }
        Insert: {
          active_entity_id?: string | null
          active_entity_type?: string | null
          chat_id: number
          collected_info?: Json | null
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          role: string
          user_id: number
        }
        Update: {
          active_entity_id?: string | null
          active_entity_type?: string | null
          chat_id?: number
          collected_info?: Json | null
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          role?: string
          user_id?: number
        }
        Relationships: []
      }
      telegram_notification_preferences: {
        Row: {
          briefing_time: string | null
          briefing_timezone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notify_morning_briefing: boolean | null
          notify_new_bookings: boolean | null
          notify_new_leads: boolean | null
          notify_task_reminders: boolean | null
          task_reminder_minutes: number | null
          telegram_chat_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          briefing_time?: string | null
          briefing_timezone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_morning_briefing?: boolean | null
          notify_new_bookings?: boolean | null
          notify_new_leads?: boolean | null
          notify_task_reminders?: boolean | null
          task_reminder_minutes?: number | null
          telegram_chat_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          briefing_time?: string | null
          briefing_timezone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_morning_briefing?: boolean | null
          notify_new_bookings?: boolean | null
          notify_new_leads?: boolean | null
          notify_task_reminders?: boolean | null
          task_reminder_minutes?: number | null
          telegram_chat_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_processed_updates: {
        Row: {
          chat_id: number
          created_at: string
          processed_at: string
          response_preview: string | null
          status: string
          update_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          processed_at?: string
          response_preview?: string | null
          status?: string
          update_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          processed_at?: string
          response_preview?: string | null
          status?: string
          update_id?: number
        }
        Relationships: []
      }
      telegram_reminders: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          remind_at: string
          reminder_text: string
          sent_at: string | null
          status: string
          user_id: number
          user_name: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          remind_at: string
          reminder_text: string
          sent_at?: string | null
          status?: string
          user_id: number
          user_name?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          remind_at?: string
          reminder_text?: string
          sent_at?: string | null
          status?: string
          user_id?: number
          user_name?: string | null
        }
        Relationships: []
      }
      telegram_sent_notifications: {
        Row: {
          chat_id: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message_id: string | null
          notification_type: string
          sent_at: string | null
        }
        Insert: {
          chat_id: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_id?: string | null
          notification_type: string
          sent_at?: string | null
        }
        Update: {
          chat_id?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_id?: string | null
          notification_type?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      telegram_stats: {
        Row: {
          ai_tokens_used: number | null
          chat_id: number
          command_name: string | null
          created_at: string
          error_message: string | null
          id: string
          message_type: string
          processing_time_ms: number | null
          status: string
          user_name: string | null
        }
        Insert: {
          ai_tokens_used?: number | null
          chat_id: number
          command_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_type: string
          processing_time_ms?: number | null
          status?: string
          user_name?: string | null
        }
        Update: {
          ai_tokens_used?: number | null
          chat_id?: number
          command_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          processing_time_ms?: number | null
          status?: string
          user_name?: string | null
        }
        Relationships: []
      }
      transcription_participants: {
        Row: {
          ai_suggested_match: Json | null
          confidence_score: number | null
          created_at: string
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          name: string
          presence_status: string
          role_in_meeting: string | null
          speaker_label: string | null
          transcription_id: string
          updated_at: string
        }
        Insert: {
          ai_suggested_match?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          name: string
          presence_status?: string
          role_in_meeting?: string | null
          speaker_label?: string | null
          transcription_id: string
          updated_at?: string
        }
        Update: {
          ai_suggested_match?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          name?: string
          presence_status?: string
          role_in_meeting?: string | null
          speaker_label?: string | null
          transcription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_participants_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "voice_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_partners: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          role: string | null
          transcription_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          role?: string | null
          transcription_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          role?: string | null
          transcription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_partners_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "voice_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          ai_metadata: Json | null
          ai_summary: string | null
          category: string | null
          content_hash: string | null
          created_at: string | null
          document_id: string | null
          download_count: number | null
          extracted_content: string | null
          file_size_bytes: number | null
          file_type: string
          generated_document_id: string | null
          id: string
          is_latest: boolean | null
          lead_ids: string[] | null
          mime_type: string | null
          ocr_confidence: number | null
          ocr_provider: string | null
          ocr_required: boolean | null
          original_filename: string
          parent_file_id: string | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          project_ids: string[] | null
          share_expires_at: string | null
          share_password_hash: string | null
          share_token: string | null
          solution_ids: string[] | null
          storage_path: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          ai_summary?: string | null
          category?: string | null
          content_hash?: string | null
          created_at?: string | null
          document_id?: string | null
          download_count?: number | null
          extracted_content?: string | null
          file_size_bytes?: number | null
          file_type: string
          generated_document_id?: string | null
          id?: string
          is_latest?: boolean | null
          lead_ids?: string[] | null
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_required?: boolean | null
          original_filename: string
          parent_file_id?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_ids?: string[] | null
          share_expires_at?: string | null
          share_password_hash?: string | null
          share_token?: string | null
          solution_ids?: string[] | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workspace_id?: string
        }
        Update: {
          ai_metadata?: Json | null
          ai_summary?: string | null
          category?: string | null
          content_hash?: string | null
          created_at?: string | null
          document_id?: string | null
          download_count?: number | null
          extracted_content?: string | null
          file_size_bytes?: number | null
          file_type?: string
          generated_document_id?: string | null
          id?: string
          is_latest?: boolean | null
          lead_ids?: string[] | null
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_required?: boolean | null
          original_filename?: string
          parent_file_id?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_ids?: string[] | null
          share_expires_at?: string | null
          share_password_hash?: string | null
          share_token?: string | null
          solution_ids?: string[] | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vectorization_status: {
        Row: {
          created_at: string | null
          id: string
          indexed_resources: number
          last_error: string | null
          last_indexed_at: string | null
          resource_type: string
          total_chunks: number | null
          total_resources: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indexed_resources?: number
          last_error?: string | null
          last_indexed_at?: string | null
          resource_type: string
          total_chunks?: number | null
          total_resources?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indexed_resources?: number
          last_error?: string | null
          last_indexed_at?: string | null
          resource_type?: string
          total_chunks?: number | null
          total_resources?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      vivier_campaign_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          recipient_id: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          recipient_id?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          recipient_id?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivier_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vivier_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "vivier_campaign_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vivier_campaign_recipients: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          click_count: number | null
          click_urls: Json | null
          clicked_at: string | null
          company: string | null
          company_name: string | null
          created_at: string | null
          current_step: number | null
          custom_variables: Json | null
          delivered_at: string | null
          email: string
          first_name: string | null
          id: string
          import_batch_id: string | null
          instantly_lead_id: string | null
          last_name: string | null
          lead_id: string | null
          name: string | null
          open_count: number | null
          opened_at: string | null
          promoted_at: string | null
          promoted_to_lead_id: string | null
          promotion_reason: string | null
          replied_at: string | null
          sent_at: string | null
          source: string | null
          status: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          variables_data: Json | null
          vivier_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          click_urls?: Json | null
          clicked_at?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string | null
          current_step?: number | null
          custom_variables?: Json | null
          delivered_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          import_batch_id?: string | null
          instantly_lead_id?: string | null
          last_name?: string | null
          lead_id?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          promotion_reason?: string | null
          replied_at?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          variables_data?: Json | null
          vivier_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          click_urls?: Json | null
          clicked_at?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string | null
          current_step?: number | null
          custom_variables?: Json | null
          delivered_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          import_batch_id?: string | null
          instantly_lead_id?: string | null
          last_name?: string | null
          lead_id?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          promotion_reason?: string | null
          replied_at?: string | null
          sent_at?: string | null
          source?: string | null
          status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          variables_data?: Json | null
          vivier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vivier_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vivier_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_recipients_promoted_to_lead_id_fkey"
            columns: ["promoted_to_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_recipients_vivier_id_fkey"
            columns: ["vivier_id"]
            isOneToOne: false
            referencedRelation: "viviers"
            referencedColumns: ["id"]
          },
        ]
      }
      vivier_campaign_stats: {
        Row: {
          campaign_count: number
          created_at: string
          first_campaign_at: string | null
          has_bounced: boolean
          has_clicked: boolean
          has_opened: boolean
          has_unsubscribed: boolean
          last_campaign_at: string | null
          last_click_at: string | null
          last_open_at: string | null
          promoted_at: string | null
          promoted_to_lead_id: string | null
          updated_at: string
          vivier_id: string
        }
        Insert: {
          campaign_count?: number
          created_at?: string
          first_campaign_at?: string | null
          has_bounced?: boolean
          has_clicked?: boolean
          has_opened?: boolean
          has_unsubscribed?: boolean
          last_campaign_at?: string | null
          last_click_at?: string | null
          last_open_at?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          updated_at?: string
          vivier_id: string
        }
        Update: {
          campaign_count?: number
          created_at?: string
          first_campaign_at?: string | null
          has_bounced?: boolean
          has_clicked?: boolean
          has_opened?: boolean
          has_unsubscribed?: boolean
          last_campaign_at?: string | null
          last_click_at?: string | null
          last_open_at?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          updated_at?: string
          vivier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivier_campaign_stats_promoted_to_lead_id_fkey"
            columns: ["promoted_to_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivier_campaign_stats_vivier_id_fkey"
            columns: ["vivier_id"]
            isOneToOne: true
            referencedRelation: "viviers"
            referencedColumns: ["id"]
          },
        ]
      }
      vivier_campaigns: {
        Row: {
          ai_generated: boolean | null
          ai_metadata: Json | null
          ai_prompt_slug: string | null
          body_html: string | null
          body_text: string | null
          bounce_count: number | null
          bounce_rate: number | null
          click_count: number | null
          click_rate: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          daily_limit: number | null
          delivered_count: number | null
          domain_id: string | null
          html_content: string | null
          id: string
          import_source: string | null
          instantly_account_id: string | null
          instantly_campaign_id: string | null
          instantly_status: string | null
          last_synced_at: string | null
          launched_at: string | null
          metadata: Json | null
          name: string
          open_count: number | null
          open_rate: number | null
          preview_text: string | null
          reply_count: number | null
          reply_rate: number | null
          reply_to: string | null
          schedule_days: Json | null
          schedule_from: string | null
          schedule_timezone: string | null
          schedule_to: string | null
          scheduled_at: string | null
          segment_criteria: Json | null
          send_schedule: Json | null
          sender_email: string | null
          sender_name: string | null
          sent_count: number | null
          sequence_steps: Json | null
          slug: string | null
          started_at: string | null
          status: string | null
          subject: string | null
          template_theme: string | null
          test_recipients: string[] | null
          test_sent_at: string | null
          text_content: string | null
          total_recipients: number | null
          unsubscribe_count: number | null
          updated_at: string | null
          variables: Json | null
          vivier_ids: string[] | null
          workspace_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_prompt_slug?: string | null
          body_html?: string | null
          body_text?: string | null
          bounce_count?: number | null
          bounce_rate?: number | null
          click_count?: number | null
          click_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          delivered_count?: number | null
          domain_id?: string | null
          html_content?: string | null
          id?: string
          import_source?: string | null
          instantly_account_id?: string | null
          instantly_campaign_id?: string | null
          instantly_status?: string | null
          last_synced_at?: string | null
          launched_at?: string | null
          metadata?: Json | null
          name: string
          open_count?: number | null
          open_rate?: number | null
          preview_text?: string | null
          reply_count?: number | null
          reply_rate?: number | null
          reply_to?: string | null
          schedule_days?: Json | null
          schedule_from?: string | null
          schedule_timezone?: string | null
          schedule_to?: string | null
          scheduled_at?: string | null
          segment_criteria?: Json | null
          send_schedule?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          sent_count?: number | null
          sequence_steps?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          template_theme?: string | null
          test_recipients?: string[] | null
          test_sent_at?: string | null
          text_content?: string | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string | null
          variables?: Json | null
          vivier_ids?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_prompt_slug?: string | null
          body_html?: string | null
          body_text?: string | null
          bounce_count?: number | null
          bounce_rate?: number | null
          click_count?: number | null
          click_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          delivered_count?: number | null
          domain_id?: string | null
          html_content?: string | null
          id?: string
          import_source?: string | null
          instantly_account_id?: string | null
          instantly_campaign_id?: string | null
          instantly_status?: string | null
          last_synced_at?: string | null
          launched_at?: string | null
          metadata?: Json | null
          name?: string
          open_count?: number | null
          open_rate?: number | null
          preview_text?: string | null
          reply_count?: number | null
          reply_rate?: number | null
          reply_to?: string | null
          schedule_days?: Json | null
          schedule_from?: string | null
          schedule_timezone?: string | null
          schedule_to?: string | null
          scheduled_at?: string | null
          segment_criteria?: Json | null
          send_schedule?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          sent_count?: number | null
          sequence_steps?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          template_theme?: string | null
          test_recipients?: string[] | null
          test_sent_at?: string | null
          text_content?: string | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string | null
          variables?: Json | null
          vivier_ids?: string[] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vivier_campaigns_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "email_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      vivier_imports: {
        Row: {
          column_mapping: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duplicate_rows: number | null
          error_log: Json | null
          error_rows: number | null
          filename: string
          id: string
          imported_rows: number | null
          source: string
          status: string | null
          total_rows: number | null
          workspace_id: string | null
        }
        Insert: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_rows?: number | null
          error_log?: Json | null
          error_rows?: number | null
          filename: string
          id?: string
          imported_rows?: number | null
          source: string
          status?: string | null
          total_rows?: number | null
          workspace_id?: string | null
        }
        Update: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_rows?: number | null
          error_log?: Json | null
          error_rows?: number | null
          filename?: string
          id?: string
          imported_rows?: number | null
          source?: string
          status?: string | null
          total_rows?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      vivier_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          criteria_json: Json | null
          description: string | null
          id: string
          last_sync_at: string | null
          lead_count: number | null
          list_type: string
          name: string
          static_vivier_ids: string[] | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          criteria_json?: Json | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          lead_count?: number | null
          list_type?: string
          name: string
          static_vivier_ids?: string[] | null
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          criteria_json?: Json | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          lead_count?: number | null
          list_type?: string
          name?: string
          static_vivier_ids?: string[] | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      viviers: {
        Row: {
          address: string | null
          batch_id: string | null
          city: string | null
          cold_score: number | null
          company_name: string | null
          company_size: string | null
          consent_marketing: boolean | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_name: string | null
          contact_position: string | null
          country: string | null
          created_at: string | null
          creation_date: string | null
          email: string | null
          employee_count: number | null
          external_id: string | null
          id: string
          industry: string | null
          legal_form: string | null
          linkedin_url: string | null
          naf_code: string | null
          notes: string | null
          phone: string | null
          phone2: string | null
          postal_code: string | null
          promoted_at: string | null
          promoted_to_lead_id: string | null
          raw_data: Json | null
          region: string | null
          revenue_range: string | null
          scored_at: string | null
          scoring_batch_id: string | null
          scoring_criteria: Json | null
          siren: string | null
          siret: string | null
          slug: string | null
          source: string
          source_file: string | null
          status: string | null
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          batch_id?: string | null
          city?: string | null
          cold_score?: number | null
          company_name?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_name?: string | null
          contact_position?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          email?: string | null
          employee_count?: number | null
          external_id?: string | null
          id?: string
          industry?: string | null
          legal_form?: string | null
          linkedin_url?: string | null
          naf_code?: string | null
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          postal_code?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          raw_data?: Json | null
          region?: string | null
          revenue_range?: string | null
          scored_at?: string | null
          scoring_batch_id?: string | null
          scoring_criteria?: Json | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          source: string
          source_file?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          batch_id?: string | null
          city?: string | null
          cold_score?: number | null
          company_name?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_name?: string | null
          contact_position?: string | null
          country?: string | null
          created_at?: string | null
          creation_date?: string | null
          email?: string | null
          employee_count?: number | null
          external_id?: string | null
          id?: string
          industry?: string | null
          legal_form?: string | null
          linkedin_url?: string | null
          naf_code?: string | null
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          postal_code?: string | null
          promoted_at?: string | null
          promoted_to_lead_id?: string | null
          raw_data?: Json | null
          region?: string | null
          revenue_range?: string | null
          scored_at?: string | null
          scoring_batch_id?: string | null
          scoring_criteria?: Json | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          source?: string
          source_file?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      voice_transcriptions: {
        Row: {
          ai_documents_summary: string | null
          ai_metadata: Json
          ai_usage_id: string | null
          analysis_context: string | null
          audio_format: string | null
          auto_create_tasks: boolean
          created_at: string
          created_by: string
          created_by_partner_id: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          idempotency_key: string | null
          lead_contact_id: string | null
          lead_id: string | null
          llm_model_id: string | null
          meeting_note_id: string | null
          original_filename: string | null
          project_id: string | null
          prompt_profile_id: string | null
          raw_transcript: string | null
          segments: Json | null
          slug: string | null
          solution_id: string | null
          source: string
          status: string
          storage_path: string
          summary: Json | null
          synthesis_stale: boolean | null
          title: string | null
          transcription_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_documents_summary?: string | null
          ai_metadata?: Json
          ai_usage_id?: string | null
          analysis_context?: string | null
          audio_format?: string | null
          auto_create_tasks?: boolean
          created_at?: string
          created_by: string
          created_by_partner_id?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          idempotency_key?: string | null
          lead_contact_id?: string | null
          lead_id?: string | null
          llm_model_id?: string | null
          meeting_note_id?: string | null
          original_filename?: string | null
          project_id?: string | null
          prompt_profile_id?: string | null
          raw_transcript?: string | null
          segments?: Json | null
          slug?: string | null
          solution_id?: string | null
          source: string
          status?: string
          storage_path: string
          summary?: Json | null
          synthesis_stale?: boolean | null
          title?: string | null
          transcription_date?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_documents_summary?: string | null
          ai_metadata?: Json
          ai_usage_id?: string | null
          analysis_context?: string | null
          audio_format?: string | null
          auto_create_tasks?: boolean
          created_at?: string
          created_by?: string
          created_by_partner_id?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          idempotency_key?: string | null
          lead_contact_id?: string | null
          lead_id?: string | null
          llm_model_id?: string | null
          meeting_note_id?: string | null
          original_filename?: string | null
          project_id?: string | null
          prompt_profile_id?: string | null
          raw_transcript?: string | null
          segments?: Json | null
          slug?: string | null
          solution_id?: string | null
          source?: string
          status?: string
          storage_path?: string
          summary?: Json | null
          synthesis_stale?: boolean | null
          title?: string | null
          transcription_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_voice_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_voice_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_voice_prompt"
            columns: ["prompt_profile_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_voice_solution"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_ai_usage_id_fkey"
            columns: ["ai_usage_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_created_by_partner_id_fkey"
            columns: ["created_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_lead_contact_id_fkey"
            columns: ["lead_contact_id"]
            isOneToOne: false
            referencedRelation: "lead_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_llm_model_id_fkey"
            columns: ["llm_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_quotas: {
        Row: {
          alert_threshold_percent: number | null
          created_at: string | null
          current_period_start: string | null
          hard_limit_enabled: boolean | null
          id: string
          monthly_cost_limit_cents: number | null
          monthly_token_limit: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          alert_threshold_percent?: number | null
          created_at?: string | null
          current_period_start?: string | null
          hard_limit_enabled?: boolean | null
          id?: string
          monthly_cost_limit_cents?: number | null
          monthly_token_limit?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          alert_threshold_percent?: number | null
          created_at?: string | null
          current_period_start?: string | null
          hard_limit_enabled?: boolean | null
          id?: string
          monthly_cost_limit_cents?: number | null
          monthly_token_limit?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_quotas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_usage: {
        Row: {
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          request_count: number | null
          total_cost_cents: number | null
          total_tokens: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          request_count?: number | null
          total_cost_cents?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          request_count?: number | null
          total_cost_cents?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          suspended_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          suspended_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          suspended_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_partner_settings: {
        Row: {
          digest_day: string
          digest_enabled: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          digest_day?: string
          digest_enabled?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          digest_day?: string
          digest_enabled?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_partner_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          billing_owner_id: string | null
          billing_status: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          settings: Json | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_owner_id?: string | null
          billing_status?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          billing_owner_id?: string | null
          billing_status?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_dashboard_metrics: {
        Row: {
          indexed_types: number | null
          leads_stale: number | null
          memory_24h: number | null
          partners_stale: number | null
          pending_notifications: number | null
          projects_stale: number | null
          total_embeddings: number | null
        }
        Relationships: []
      }
      api_usage_summary: {
        Row: {
          api_category: string | null
          api_name: string | null
          avg_latency_ms: number | null
          error_count: number | null
          provider_name: string | null
          request_count: number | null
          success_count: number | null
          total_cost_cents: number | null
          total_tokens: number | null
          usage_date: string | null
          usage_month: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
      comments_public: {
        Row: {
          approved: boolean | null
          article_id: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          article_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          article_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms_public: {
        Row: {
          created_at: string | null
          description: string | null
          fields: Json | null
          id: string | null
          is_active: boolean | null
          slug: string | null
          submissions_count: number | null
          title: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string | null
          is_active?: boolean | null
          slug?: string | null
          submissions_count?: number | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string | null
          is_active?: boolean | null
          slug?: string | null
          submissions_count?: number | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      partner_activity_feed: {
        Row: {
          activity_type: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          partner_id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_backup_log: {
        Args: {
          backup_id: string
          log_details?: Json
          log_level: string
          log_message: string
        }
        Returns: undefined
      }
      ai_action_transition_status: {
        Args: {
          _action_id: string
          _actor: string
          _by?: string
          _new_status: string
          _reason: string
          _snooze_days?: number
        }
        Returns: {
          action_text: string
          artifact: Json | null
          artifact_generated_at: string | null
          artifact_model: string | null
          artifact_status: string | null
          artifact_type: string | null
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          impact_value: number | null
          reasoning: string | null
          signature: string
          snooze_until: string | null
          source: string
          status: string
          structured_updates: Json
          updated_at: string
          urgency: string | null
          user_id: string | null
          user_notes: Json
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_entity_workspace: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      can_access_workspace: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      check_cockpit_mfa_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_ai_memory: { Args: never; Returns: number }
      cleanup_expired_cockpit_data: { Args: never; Returns: undefined }
      cleanup_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_telegram_context: { Args: never; Returns: number }
      cleanup_old_telegram_updates: { Args: never; Returns: undefined }
      cleanup_orphan_data: {
        Args: never
        Returns: {
          orphan_article_views: number
          orphan_atelier_inscriptions: number
          orphan_comments: number
        }[]
      }
      cleanup_rate_limit_requests: { Args: never; Returns: undefined }
      count_atelier_inscriptions: {
        Args: { atelier_uuid: string }
        Returns: number
      }
      count_viviers_by_department: {
        Args: { p_department: string }
        Returns: number
      }
      count_viviers_by_filter: {
        Args: {
          p_filter_type: string
          p_filter_value?: string
          p_max_score?: number
          p_min_score?: number
        }
        Returns: number
      }
      count_viviers_by_postal_code: {
        Args: { p_postal_code: string }
        Returns: number
      }
      create_entity_reference: {
        Args: {
          p_confidence?: number
          p_context?: string
          p_reference_type?: string
          p_source_id: string
          p_source_type: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      delete_lead_cascade: { Args: { p_lead_id: string }; Returns: undefined }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      ensure_cockpit_session: { Args: { user_uuid: string }; Returns: boolean }
      generate_file_share_link: {
        Args: {
          p_expires_in_days?: number
          p_file_id: string
          p_password?: string
        }
        Returns: string
      }
      generate_next_quote_number: {
        Args: { p_billing_entity_id: string }
        Returns: string
      }
      generate_phonetic_key: { Args: { input_text: string }; Returns: string }
      get_api_usage_status: {
        Args: { p_api_name?: string; p_period?: string; p_workspace_id: string }
        Returns: {
          api_category: string
          api_name: string
          provider_name: string
          quota_cost: number
          quota_requests: number
          quota_tokens: number
          request_count: number
          status: string
          total_cost_cents: number
          total_tokens: number
          usage_percent_cost: number
          usage_percent_requests: number
          usage_percent_tokens: number
        }[]
      }
      get_crm_graph: {
        Args: {
          p_depth?: number
          p_entity_id: string
          p_entity_type: string
          p_workspace_id?: string
        }
        Returns: Json
      }
      get_current_partner_id: { Args: never; Returns: string }
      get_document_workspace_id: {
        Args: { p_document_id: string }
        Returns: string
      }
      get_entity_references: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          confidence_score: number
          context: string
          created_at: string
          direction: string
          id: string
          reference_type: string
          related_entity_id: string
          related_entity_type: string
        }[]
      }
      get_project_workspace_id: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_recent_ai_memory: {
        Args: {
          p_limit?: number
          p_memory_types?: string[]
          p_session_id?: string
          p_user_id?: string
          p_workspace_id?: string
        }
        Returns: {
          category: string
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          importance_score: number
          memory_type: string
          metadata: Json
        }[]
      }
      get_vivier_engagement_stats: {
        Args: { p_vivier_ids: string[] }
        Returns: {
          campaign_count: number
          engagement_level: string
          has_bounced: boolean
          has_clicked: boolean
          has_opened: boolean
          vivier_id: string
        }[]
      }
      get_viviers_by_department: {
        Args: {
          p_department: string
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_order_dir?: string
        }
        Returns: {
          city: string
          cold_score: number
          company_name: string
          contact_first_name: string
          contact_last_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          industry: string
          legal_form: string
          phone: string
          postal_code: string
          siret: string
          status: string
        }[]
      }
      get_viviers_by_filter: {
        Args: {
          p_filter_type: string
          p_filter_value?: string
          p_limit?: number
          p_max_score?: number
          p_min_score?: number
          p_offset?: number
          p_order_by?: string
          p_order_dir?: string
        }
        Returns: {
          address: string
          batch_id: string
          city: string
          cold_score: number
          company_name: string
          company_size: string
          consent_marketing: boolean
          contact_first_name: string
          contact_last_name: string
          contact_name: string
          contact_position: string
          country: string
          created_at: string
          creation_date: string
          email: string
          employee_count: number
          external_id: string
          id: string
          industry: string
          legal_form: string
          linkedin_url: string
          naf_code: string
          notes: string
          phone: string
          postal_code: string
          promoted_at: string
          promoted_to_lead_id: string
          raw_data: Json
          region: string
          revenue_range: string
          scoring_criteria: Json
          siren: string
          siret: string
          source: string
          source_file: string
          status: string
          tags: string[]
          unsubscribed_at: string
          updated_at: string
          website: string
          workspace_id: string
        }[]
      }
      get_viviers_by_postal_code: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_order_dir?: string
          p_postal_code: string
        }
        Returns: {
          city: string
          cold_score: number
          company_name: string
          contact_first_name: string
          contact_last_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          industry: string
          legal_form: string
          phone: string
          postal_code: string
          siret: string
          status: string
        }[]
      }
      get_viviers_departments: {
        Args: never
        Returns: {
          department_code: string
        }[]
      }
      get_viviers_filter_options:
        | { Args: never; Returns: Json }
        | {
            Args: { p_department?: string; p_limit?: number }
            Returns: {
              option_type: string
              option_value: string
            }[]
          }
      get_viviers_stats: {
        Args: never
        Returns: {
          pending_scoring: number
          promoted: number
          qualified: number
          scored: number
          total_leads: number
        }[]
      }
      get_viviers_with_city_prefix_in_size: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          company_size: string
          id: string
        }[]
      }
      get_viviers_with_city_siren_in_size: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          company_size: string
          id: string
          siret: string
        }[]
      }
      get_viviers_with_email_in_contact: {
        Args: { p_limit?: number }
        Returns: {
          contact_name: string
          email: string
          id: string
        }[]
      }
      get_viviers_with_invalid_siret: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          siret: string
        }[]
      }
      get_viviers_with_naf_in_size: {
        Args: { p_limit?: number }
        Returns: {
          company_size: string
          id: string
          naf_code: string
        }[]
      }
      get_viviers_with_siret_in_size: {
        Args: { p_limit?: number }
        Returns: {
          company_size: string
          id: string
          siret: string
        }[]
      }
      get_viviers_with_truncated_naf: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          naf_code: string
        }[]
      }
      get_viviers_with_year_in_naf: {
        Args: { p_limit?: number }
        Returns: {
          creation_date: string
          id: string
          naf_code: string
        }[]
      }
      get_viviers_with_year_in_size: {
        Args: { p_limit?: number }
        Returns: {
          company_size: string
          creation_date: string
          id: string
        }[]
      }
      get_workspace_quotas: {
        Args: { p_workspace_id: string }
        Returns: {
          api_name: string
          current_count: number
          limit_count: number
          period_end: string
        }[]
      }
      has_cockpit_access: { Args: { user_uuid: string }; Returns: boolean }
      has_partner_access: { Args: { user_uuid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: { p_min_role: string; p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      increment_form_submissions: {
        Args: { form_slug: string }
        Returns: undefined
      }
      increment_form_views: { Args: { form_slug: string }; Returns: undefined }
      increment_workspace_ai_usage: {
        Args: {
          p_cost_cents: number
          p_period_start: string
          p_tokens: number
          p_workspace_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_document_partner: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: boolean
      }
      is_lead_creator_partner: {
        Args: { p_lead_id: string; p_user_id: string }
        Returns: boolean
      }
      is_lead_partner: {
        Args: { p_lead_id: string; p_user_id: string }
        Returns: boolean
      }
      is_partner_user: { Args: never; Returns: boolean }
      is_project_creator_partner: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_project_partner: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_solution_partner: {
        Args: { p_solution_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_transcription_creator_partner: {
        Args: { p_transcription_id: string; p_user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      log_partner_login: {
        Args: {
          p_ip_address?: string
          p_partner_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_ai_notifications_reviewed: {
        Args: { p_ids: string[] }
        Returns: number
      }
      promote_vivier_to_lead: {
        Args: { p_qualification_status?: string; p_vivier_id: string }
        Returns: string
      }
      record_api_usage: {
        Args: {
          p_api_category: string
          p_api_name: string
          p_billing_entity_id?: string
          p_entity_id?: string
          p_entity_type?: string
          p_error_code?: string
          p_error_message?: string
          p_estimated_cost_cents?: number
          p_input_tokens?: number
          p_latency_ms?: number
          p_metadata?: Json
          p_model_id?: string
          p_operation_type: string
          p_output_tokens?: number
          p_provider_name: string
          p_success?: boolean
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: string
      }
      refresh_stale_syntheses: {
        Args: { max_items?: number }
        Returns: {
          entity_id: string
          entity_name: string
          entity_type: string
          refreshed: boolean
        }[]
      }
      search_ai_memory: {
        Args: {
          p_match_count?: number
          p_match_threshold?: number
          p_memory_types?: string[]
          p_query_embedding: string
          p_session_id?: string
          p_user_id?: string
          p_workspace_id?: string
        }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          importance_score: number
          memory_type: string
          metadata: Json
          similarity: number
        }[]
      }
      search_entities_fuzzy: {
        Args: { entity_types?: string[]; search_term: string }
        Returns: {
          entity_company: string
          entity_id: string
          entity_name: string
          entity_type: string
          similarity_score: number
        }[]
      }
      search_similar_resources: {
        Args: {
          filter_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_chunk: string
          metadata: Json
          resource_id: string
          resource_slug: string
          resource_title: string
          resource_type: string
          similarity: number
        }[]
      }
      search_similar_resources_text: {
        Args: {
          filter_types?: string[]
          match_count?: number
          match_threshold?: number
          p_workspace_id?: string
          query_embedding_text: string
        }
        Returns: {
          content_chunk: string
          metadata: Json
          resource_id: string
          resource_slug: string
          resource_title: string
          resource_type: string
          similarity: number
        }[]
      }
      search_viviers_cities: {
        Args: { p_limit?: number; p_search: string }
        Returns: {
          city: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { input_text: string }; Returns: string }
      unlock_expired_accounts: { Args: never; Returns: undefined }
      update_lead_familiarity: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      upsert_lead: {
        Args: {
          p_company?: string
          p_consent_marketing?: boolean
          p_email: string
          p_message?: string
          p_name: string
          p_phone?: string
          p_qualification_status?: string
          p_source: string
          p_source_context?: string
          p_source_id?: string
          p_workspace_id?: string
        }
        Returns: string
      }
      validate_partner_invitation: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          is_valid: boolean
        }[]
      }
      validate_resource_type: {
        Args: never
        Returns: {
          article_id: string
          issue: string
          resource_type: string
          title: string
        }[]
      }
      verify_file_share_access: {
        Args: { p_password?: string; p_token: string }
        Returns: {
          error_message: string
          file_id: string
          file_type: string
          original_filename: string
          storage_path: string
          valid: boolean
        }[]
      }
      viviers_lookup_existing_by_email: {
        Args: { emails: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "cockpit_user"
        | "cockpit_admin"
        | "partner"
        | "owner"
        | "super_admin"
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
      app_role: [
        "admin",
        "user",
        "cockpit_user",
        "cockpit_admin",
        "partner",
        "owner",
        "super_admin",
      ],
    },
  },
} as const
