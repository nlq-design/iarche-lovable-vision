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
      email_configurations: {
        Row: {
          admin_email_subject: string | null
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
      leads: {
        Row: {
          ai_metadata: Json | null
          company: string | null
          company_size: string | null
          consent_marketing: boolean | null
          created_at: string | null
          email: string
          id: string
          industry: string | null
          last_contacted_at: string | null
          lead_score: number | null
          lead_score_details: Json | null
          message: string | null
          name: string
          phone: string | null
          qualification_status: string | null
          source: string
          source_context: string | null
          source_id: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_score_details?: Json | null
          message?: string | null
          name: string
          phone?: string | null
          qualification_status?: string | null
          source: string
          source_context?: string | null
          source_id?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          company?: string | null
          company_size?: string | null
          consent_marketing?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          lead_score_details?: Json | null
          message?: string | null
          name?: string
          phone?: string | null
          qualification_status?: string | null
          source?: string
          source_context?: string | null
          source_id?: string | null
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
      projects: {
        Row: {
          actual_end_date: string | null
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
          start_date: string | null
          status: string
          target_end_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          actual_end_date?: string | null
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
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Update: {
          actual_end_date?: string | null
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
          start_date?: string | null
          status?: string
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
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      specifications: {
        Row: {
          ai_generated: boolean | null
          ai_metadata: Json | null
          approved_at: string | null
          approved_by: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string | null
          status: string
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
          id?: string
          project_id?: string | null
          status?: string
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
          id?: string
          project_id?: string | null
          status?: string
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
      cleanup_expired_cockpit_data: { Args: never; Returns: undefined }
      cleanup_login_attempts: { Args: never; Returns: undefined }
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
      is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      unlock_expired_accounts: { Args: never; Returns: undefined }
      validate_resource_type: {
        Args: never
        Returns: {
          article_id: string
          issue: string
          resource_type: string
          title: string
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
