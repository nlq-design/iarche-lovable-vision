import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Mail, FileSignature } from 'lucide-react';

type BrandingPreviewValues = {
  logo_url?: string | null;
  brand_name?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  heading_font?: string | null;
  body_font?: string | null;
  footer_text?: string | null;
  document_header_html?: string | null;
  document_footer_html?: string | null;
  email_signature_html?: string | null;
};

type Mode = 'document' | 'email' | 'quote';

const safe = (v: string | null | undefined, fallback: string) =>
  v && v.trim() !== '' ? v : fallback;

const hex = (v: string | null | undefined, fallback: string) =>
  v && /^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback;

export function BrandingDocumentPreview({ values }: { values: BrandingPreviewValues }) {
  const [mode, setMode] = useState<Mode>('document');

  const tokens = useMemo(() => {
    const primary = hex(values.primary_color, '#1A2B4A');
    const secondary = hex(values.secondary_color, '#B04A32');
    const accent = hex(values.accent_color, '#FAF9F7');
    const bg = hex(values.background_color, '#FFFFFF');
    const text = hex(values.text_color, '#0F172A');
    const heading = safe(values.heading_font, 'Manrope');
    const body = safe(values.body_font, 'Inter');
    const brand = safe(values.brand_name, 'Votre marque');
    const tagline = safe(values.tagline, 'Signature de marque');
    return { primary, secondary, accent, bg, text, heading, body, brand, tagline };
  }, [values]);

  const headerHtml = values.document_header_html?.trim();
  const footerHtml = values.document_footer_html?.trim();
  const signatureHtml = values.email_signature_html?.trim();
  const footerText = safe(values.footer_text, `${tokens.brand} — Tous droits réservés`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Aperçu visuel</CardTitle>
            <CardDescription>
              Visualisez en direct le rendu de la charte sur un document, un devis ou un email avant génération.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === 'document' ? 'default' : 'outline'}
              onClick={() => setMode('document')}
            >
              <FileText className="h-4 w-4 mr-1" /> Document
            </Button>
            <Button
              size="sm"
              variant={mode === 'quote' ? 'default' : 'outline'}
              onClick={() => setMode('quote')}
            >
              <FileSignature className="h-4 w-4 mr-1" /> Devis
            </Button>
            <Button
              size="sm"
              variant={mode === 'email' ? 'default' : 'outline'}
              onClick={() => setMode('email')}
            >
              <Mail className="h-4 w-4 mr-1" /> Email
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-4 overflow-auto">
          <div
            className="mx-auto shadow-sm"
            style={{
              width: '100%',
              maxWidth: 720,
              background: tokens.bg,
              color: tokens.text,
              fontFamily: `'${tokens.body}', system-ui, sans-serif`,
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {/* HEADER */}
            <div
              style={{
                padding: '20px 28px',
                borderBottom: `3px solid ${tokens.primary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                background: tokens.accent,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {values.logo_url ? (
                  <img
                    src={values.logo_url}
                    alt={tokens.brand}
                    style={{ height: 40, width: 'auto', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 8,
                      background: tokens.primary,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontFamily: `'${tokens.heading}', sans-serif`,
                    }}
                  >
                    {tokens.brand.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontFamily: `'${tokens.heading}', sans-serif`,
                      fontWeight: 700,
                      fontSize: 16,
                      color: tokens.primary,
                      lineHeight: 1.1,
                    }}
                  >
                    {tokens.brand}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{tokens.tagline}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, textAlign: 'right' }}>
                {mode === 'quote' ? 'Devis #2026-001' : mode === 'email' ? 'Email transactionnel' : 'Document généré'}
                <br />
                {new Date().toLocaleDateString('fr-FR')}
              </div>
            </div>

            {/* Custom header HTML */}
            {headerHtml && (
              <div
                style={{ padding: '12px 28px', fontSize: 12, opacity: 0.85, borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                dangerouslySetInnerHTML={{ __html: headerHtml }}
              />
            )}

            {/* BODY */}
            <div style={{ padding: '28px' }}>
              {mode === 'document' && (
                <>
                  <h1
                    style={{
                      fontFamily: `'${tokens.heading}', sans-serif`,
                      fontSize: 24,
                      fontWeight: 700,
                      color: tokens.primary,
                      margin: '0 0 8px',
                    }}
                  >
                    Titre du document
                  </h1>
                  <div
                    style={{
                      height: 3,
                      width: 60,
                      background: tokens.secondary,
                      marginBottom: 16,
                      borderRadius: 2,
                    }}
                  />
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                    Aperçu du rendu typographique avec la police <strong>{tokens.body}</strong> pour le corps de texte
                    et <strong>{tokens.heading}</strong> pour les titres. Les couleurs principale et secondaire de la
                    charte sont appliquées aux accents.
                  </p>
                  <h2
                    style={{
                      fontFamily: `'${tokens.heading}', sans-serif`,
                      fontSize: 16,
                      fontWeight: 600,
                      color: tokens.primary,
                      margin: '16px 0 6px',
                    }}
                  >
                    Sous-titre de section
                  </h2>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    Voici un paragraphe d'exemple permettant de juger la lisibilité, le contraste du texte sur le fond
                    et l'esprit général du document généré.
                  </p>
                </>
              )}

              {mode === 'quote' && (
                <>
                  <h1
                    style={{
                      fontFamily: `'${tokens.heading}', sans-serif`,
                      fontSize: 22,
                      fontWeight: 700,
                      color: tokens.primary,
                      margin: '0 0 16px',
                    }}
                  >
                    Devis commercial
                  </h1>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: tokens.primary, color: '#fff' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Prestation</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', width: 100 }}>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Audit & cadrage stratégique', '2 400 €'],
                        ['Production opérationnelle', '6 800 €'],
                        ['Suivi mensuel (3 mois)', '1 800 €'],
                      ].map(([label, amount], i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                          <td style={{ padding: '8px 10px' }}>{label}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{amount}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: '10px', fontWeight: 700, color: tokens.secondary }}>Total HT</td>
                        <td
                          style={{
                            padding: '10px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: tokens.secondary,
                            fontFamily: `'${tokens.heading}', sans-serif`,
                          }}
                        >
                          11 000 €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {mode === 'email' && (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>Bonjour Prénom,</p>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                    Merci pour notre échange. Vous trouverez ci-joint le document récapitulatif. N'hésitez pas à
                    revenir vers nous pour toute question.
                  </p>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      display: 'inline-block',
                      background: tokens.primary,
                      color: '#fff',
                      padding: '10px 18px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontFamily: `'${tokens.heading}', sans-serif`,
                      fontWeight: 600,
                      fontSize: 13,
                      margin: '8px 0 16px',
                    }}
                  >
                    Consulter le document
                  </a>
                  {signatureHtml ? (
                    <div
                      style={{
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        paddingTop: 12,
                        fontSize: 12,
                        opacity: 0.9,
                      }}
                      dangerouslySetInnerHTML={{ __html: signatureHtml }}
                    />
                  ) : (
                    <div
                      style={{
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        paddingTop: 12,
                        fontSize: 12,
                      }}
                    >
                      <strong style={{ color: tokens.primary }}>{tokens.brand}</strong>
                      <br />
                      <span style={{ opacity: 0.7 }}>{tokens.tagline}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            {footerHtml ? (
              <div
                style={{
                  padding: '12px 28px',
                  fontSize: 11,
                  borderTop: `1px solid ${tokens.primary}`,
                  background: tokens.accent,
                  opacity: 0.85,
                }}
                dangerouslySetInnerHTML={{ __html: footerHtml }}
              />
            ) : (
              <div
                style={{
                  padding: '12px 28px',
                  fontSize: 11,
                  borderTop: `1px solid ${tokens.primary}`,
                  background: tokens.accent,
                  textAlign: 'center',
                  opacity: 0.75,
                }}
              >
                {footerText}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Aperçu indicatif. Le rendu final (PDF/DOCX) peut varier légèrement selon le moteur de génération.
        </p>
      </CardContent>
    </Card>
  );
}
