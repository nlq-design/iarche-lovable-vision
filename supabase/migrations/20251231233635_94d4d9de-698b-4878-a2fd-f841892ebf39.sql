-- Ajouter la colonne admin_email_template pour stocker les templates admin
ALTER TABLE public.email_configurations
ADD COLUMN IF NOT EXISTS admin_email_template TEXT NULL;

-- Commenter les colonnes pour clarté
COMMENT ON COLUMN public.email_configurations.user_email_template IS 'Template HTML pour les emails de confirmation envoyés aux prospects';
COMMENT ON COLUMN public.email_configurations.admin_email_template IS 'Template HTML pour les emails de notification envoyés à l''admin (nlq@nlq.fr)';