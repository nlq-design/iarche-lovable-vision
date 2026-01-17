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
          meeting_note_id: string | null
          metadata: Json | null
          opportunity_id: string | null
          pending_ai_review: boolean | null
          project_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          task_id: string | null
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
          meeting_note_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          pending_ai_review?: boolean | null
          project_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          task_id?: string | null
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
          meeting_note_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          pending_ai_review?: boolean | null
          project_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          task_id?: string | null
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
            foreignKeyName: "activity_log_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
            foreignKeyName: "activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          message: string
          name: string
          source: string | null
          source_context: string | null
          subject: string
          user_session: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          source?: string | null
          source_context?: string | null
          subject: string
          user_session?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          source?: string | null
          source_context?: string | null
          subject?: string
          user_session?: string | null
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
        ]
      }
      forms: {
        Row: {
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
        Relationships: []
      }
      generated_documents: {
        Row: {
          ai_documents_summary: string | null
          ai_generated: boolean | null
          ai_metadata: Json | null
          approved_at: string | null
          approved_by: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "keyword_alias_suggestions_created_alias_id_fkey"
            columns: ["created_alias_id"]
            isOneToOne: false
            referencedRelation: "keyword_aliases"
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
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          partner_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          partner_id?: string
          role?: string | null
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
          city: string | null
          company: string | null
          company_size: string | null
          consent_marketing: boolean | null
          country: string | null
          created_at: string | null
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
          revenue_range: string | null
          siret: string | null
          source: string
          source_context: string | null
          source_id: string | null
          synthesis_stale: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          city?: string | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          country?: string | null
          created_at?: string | null
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
          revenue_range?: string | null
          siret?: string | null
          source: string
          source_context?: string | null
          source_id?: string | null
          synthesis_stale?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_documents_summary?: string | null
          ai_metadata?: Json | null
          city?: string | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          country?: string | null
          created_at?: string | null
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
          revenue_range?: string | null
          siret?: string | null
          source?: string
          source_context?: string | null
          source_id?: string | null
          synthesis_stale?: boolean | null
          website?: string | null
        }
        Relationships: []
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
          close_reason: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_to: string | null
          probability: number | null
          source: string | null
          stage: string
          title: string
          updated_at: string | null
          value_amount: number | null
          workspace_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          assigned_to?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_to?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          title: string
          updated_at?: string | null
          value_amount?: number | null
          workspace_id?: string
        }
        Update: {
          ai_metadata?: Json | null
          assigned_to?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_to?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
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
          id: string
          is_active: boolean | null
          linkedin_url: string | null
          name: string
          partner_type: string
          phone: string | null
          slug: string
          specialties: string[] | null
          synthesis_stale: boolean | null
          updated_at: string | null
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
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name: string
          partner_type: string
          phone?: string | null
          slug: string
          specialties?: string[] | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
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
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name?: string
          partner_type?: string
          phone?: string | null
          slug?: string
          specialties?: string[] | null
          synthesis_stale?: boolean | null
          updated_at?: string | null
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
          description: string | null
          health_status: string
          id: string
          lead_id: string | null
          name: string
          opportunity_id: string | null
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
          description?: string | null
          health_status?: string
          id?: string
          lead_id?: string | null
          name: string
          opportunity_id?: string | null
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
          description?: string | null
          health_status?: string
          id?: string
          lead_id?: string | null
          name?: string
          opportunity_id?: string | null
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
        }
        Relationships: []
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
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
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
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
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
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
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
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
      workspace_members: {
        Row: {
          invited_by: string | null
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string | null
          role?: string
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
      workspaces: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      get_viviers_filter_options: {
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
      has_cockpit_access: { Args: { user_uuid: string }; Returns: boolean }
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
      is_admin: { Args: never; Returns: boolean }
      is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      mark_ai_notifications_reviewed: {
        Args: { p_ids: string[] }
        Returns: number
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
      search_viviers_cities: {
        Args: { p_limit?: number; p_search: string }
        Returns: {
          city: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
        }
        Returns: string
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
      app_role: "admin" | "user" | "cockpit_user" | "cockpit_admin"
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
      app_role: ["admin", "user", "cockpit_user", "cockpit_admin"],
    },
  },
} as const
