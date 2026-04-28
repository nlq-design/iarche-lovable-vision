INSERT INTO public.invite_codes (code, max_uses, uses_count, expires_at, email_restriction, created_by)
VALUES ('E2E-NONADMIN-TEST', 1000, 0, now() + interval '5 years', NULL, NULL)
ON CONFLICT (code) DO UPDATE
  SET expires_at = EXCLUDED.expires_at,
      max_uses = EXCLUDED.max_uses;