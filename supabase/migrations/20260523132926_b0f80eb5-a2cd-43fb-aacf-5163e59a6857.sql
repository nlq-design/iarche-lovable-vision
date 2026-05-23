-- ============= PATTERN A: parent = partners via partner_id =============

-- partner_invoices
DROP POLICY IF EXISTS "Admin manages all invoices" ON public.partner_invoices;
CREATE POLICY "Workspace admins manage partner invoices" ON public.partner_invoices FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_invoices.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_invoices.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- partner_notifications
DROP POLICY IF EXISTS "Admins full access to notifications" ON public.partner_notifications;
CREATE POLICY "Workspace admins manage partner notifications" ON public.partner_notifications FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_notifications.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_notifications.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- partner_time_entries
DROP POLICY IF EXISTS "Admin manages all time entries" ON public.partner_time_entries;
CREATE POLICY "Workspace admins manage partner time entries" ON public.partner_time_entries FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_time_entries.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_time_entries.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- partner_solution_interests
DROP POLICY IF EXISTS "Admins full access to solution interests" ON public.partner_solution_interests;
CREATE POLICY "Workspace admins manage solution interests" ON public.partner_solution_interests FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_solution_interests.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_solution_interests.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- partner_documents (replace 2 admin policies, keep "Partners can * own documents")
DROP POLICY IF EXISTS "Cockpit admins can manage partner documents" ON public.partner_documents;
DROP POLICY IF EXISTS "Cockpit users can view all partner documents" ON public.partner_documents;
CREATE POLICY "Workspace cockpit manage partner documents" ON public.partner_documents FOR ALL TO authenticated
  USING (public.is_admin() OR (public.has_cockpit_access(auth.uid()) AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_documents.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid()))))
  WITH CHECK (public.is_admin() OR (public.has_cockpit_access(auth.uid()) AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_documents.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid()))));

-- solution_partners (junction)
DROP POLICY IF EXISTS "solution_partners_select" ON public.solution_partners;
DROP POLICY IF EXISTS "solution_partners_insert" ON public.solution_partners;
DROP POLICY IF EXISTS "solution_partners_delete" ON public.solution_partners;
CREATE POLICY "solution_partners_select" ON public.solution_partners FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = solution_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "solution_partners_insert" ON public.solution_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = solution_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "solution_partners_delete" ON public.solution_partners FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = solution_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- booking_partners (junction)
DROP POLICY IF EXISTS "booking_partners_select" ON public.booking_partners;
DROP POLICY IF EXISTS "booking_partners_insert" ON public.booking_partners;
DROP POLICY IF EXISTS "booking_partners_delete" ON public.booking_partners;
CREATE POLICY "booking_partners_select" ON public.booking_partners FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = booking_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "booking_partners_insert" ON public.booking_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = booking_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "booking_partners_delete" ON public.booking_partners FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = booking_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- document_partners (junction)
DROP POLICY IF EXISTS "document_partners_select" ON public.document_partners;
DROP POLICY IF EXISTS "document_partners_insert" ON public.document_partners;
DROP POLICY IF EXISTS "document_partners_delete" ON public.document_partners;
CREATE POLICY "document_partners_select" ON public.document_partners FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_document_partner(document_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = document_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid()))
  );
CREATE POLICY "document_partners_insert" ON public.document_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = document_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "document_partners_delete" ON public.document_partners FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = document_partners.partner_id AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- ============= PATTERN B: parent = leads via lead_id =============

-- atelier_inscriptions
DROP POLICY IF EXISTS "Admins can view all inscriptions" ON public.atelier_inscriptions;
CREATE POLICY "Workspace members view atelier inscriptions" ON public.atelier_inscriptions FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = atelier_inscriptions.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));

-- solution_leads
DROP POLICY IF EXISTS "cockpit_solution_leads_select" ON public.solution_leads;
DROP POLICY IF EXISTS "cockpit_solution_leads_insert" ON public.solution_leads;
DROP POLICY IF EXISTS "cockpit_solution_leads_update" ON public.solution_leads;
DROP POLICY IF EXISTS "cockpit_solution_leads_delete" ON public.solution_leads;
CREATE POLICY "solution_leads_select" ON public.solution_leads FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = solution_leads.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));
CREATE POLICY "solution_leads_insert" ON public.solution_leads FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = solution_leads.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));
CREATE POLICY "solution_leads_update" ON public.solution_leads FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = solution_leads.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));
CREATE POLICY "solution_leads_delete" ON public.solution_leads FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = solution_leads.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));

-- lead_partners (junction)
DROP POLICY IF EXISTS "lead_partners_select" ON public.lead_partners;
DROP POLICY IF EXISTS "lead_partners_insert" ON public.lead_partners;
DROP POLICY IF EXISTS "lead_partners_delete" ON public.lead_partners;
CREATE POLICY "lead_partners_select" ON public.lead_partners FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_partner_user() AND public.is_lead_partner(lead_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_partners.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid()))
  );
CREATE POLICY "lead_partners_insert" ON public.lead_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_partners.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));
CREATE POLICY "lead_partners_delete" ON public.lead_partners FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_partners.lead_id AND public.is_workspace_member(l.workspace_id, auth.uid())));

-- ============= PATTERN C: parent = forms via form_id =============

DROP POLICY IF EXISTS "Admin peut voir responses" ON public.form_responses;
DROP POLICY IF EXISTS "Admin peut supprimer responses" ON public.form_responses;
CREATE POLICY "Workspace admins view form responses" ON public.form_responses FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id, auth.uid())));
CREATE POLICY "Workspace admins delete form responses" ON public.form_responses FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id, auth.uid())));

DROP POLICY IF EXISTS "Admin peut voir analytics" ON public.form_analytics;
CREATE POLICY "Workspace admins view form analytics" ON public.form_analytics FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_analytics.form_id AND public.is_workspace_member(f.workspace_id, auth.uid())));

-- ============= PATTERN D: parent = voice_transcriptions via transcription_id =============

DROP POLICY IF EXISTS "Cockpit users can view transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Cockpit users can insert transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Cockpit users can update transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Cockpit users can delete transcription participants" ON public.transcription_participants;
CREATE POLICY "transcription_participants_select" ON public.transcription_participants FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.voice_transcriptions vt WHERE vt.id = transcription_participants.transcription_id AND public.is_workspace_member(vt.workspace_id, auth.uid())));
CREATE POLICY "transcription_participants_insert" ON public.transcription_participants FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.voice_transcriptions vt WHERE vt.id = transcription_participants.transcription_id AND public.is_workspace_member(vt.workspace_id, auth.uid())));
CREATE POLICY "transcription_participants_update" ON public.transcription_participants FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.voice_transcriptions vt WHERE vt.id = transcription_participants.transcription_id AND public.is_workspace_member(vt.workspace_id, auth.uid())));
CREATE POLICY "transcription_participants_delete" ON public.transcription_participants FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.voice_transcriptions vt WHERE vt.id = transcription_participants.transcription_id AND public.is_workspace_member(vt.workspace_id, auth.uid())));

-- ============= PATTERN E: parent = vivier_campaigns / viviers =============

DROP POLICY IF EXISTS "Cockpit users can manage vivier_campaign_recipients" ON public.vivier_campaign_recipients;
CREATE POLICY "vivier_campaign_recipients_manage" ON public.vivier_campaign_recipients FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.vivier_campaigns c WHERE c.id = vivier_campaign_recipients.campaign_id AND public.is_workspace_member(c.workspace_id, auth.uid())))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.vivier_campaigns c WHERE c.id = vivier_campaign_recipients.campaign_id AND public.is_workspace_member(c.workspace_id, auth.uid())));

DROP POLICY IF EXISTS "Cockpit users can view vivier campaign stats" ON public.vivier_campaign_stats;
DROP POLICY IF EXISTS "Cockpit users can insert vivier campaign stats" ON public.vivier_campaign_stats;
DROP POLICY IF EXISTS "Cockpit users can update vivier campaign stats" ON public.vivier_campaign_stats;
CREATE POLICY "vivier_campaign_stats_select" ON public.vivier_campaign_stats FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.viviers v WHERE v.id = vivier_campaign_stats.vivier_id AND public.is_workspace_member(v.workspace_id, auth.uid())));
CREATE POLICY "vivier_campaign_stats_insert" ON public.vivier_campaign_stats FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.viviers v WHERE v.id = vivier_campaign_stats.vivier_id AND public.is_workspace_member(v.workspace_id, auth.uid())));
CREATE POLICY "vivier_campaign_stats_update" ON public.vivier_campaign_stats FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.viviers v WHERE v.id = vivier_campaign_stats.vivier_id AND public.is_workspace_member(v.workspace_id, auth.uid())));
