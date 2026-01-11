-- Créer le trigger pour générer automatiquement le slug des campagnes
DROP TRIGGER IF EXISTS trigger_generate_campaign_slug ON public.vivier_campaigns;
CREATE TRIGGER trigger_generate_campaign_slug
  BEFORE INSERT OR UPDATE ON public.vivier_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_campaign_slug();

-- Créer le trigger pour mettre à jour updated_at des recipients
DROP TRIGGER IF EXISTS trigger_update_vcr_updated_at ON public.vivier_campaign_recipients;
CREATE TRIGGER trigger_update_vcr_updated_at
  BEFORE UPDATE ON public.vivier_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vivier_campaign_recipients_updated_at();