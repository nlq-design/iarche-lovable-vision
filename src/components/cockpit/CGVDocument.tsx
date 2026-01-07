import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DOMPurify from 'dompurify';

interface CGVDocumentProps {
  cgvContent: string;
  billingEntityName?: string;
}

export const CGVDocument = forwardRef<HTMLDivElement, CGVDocumentProps>(
  ({ cgvContent, billingEntityName = 'IArche' }, ref) => {
    return (
      <div 
        ref={ref}
        className="bg-white font-sans text-sm leading-relaxed"
        style={{ 
          width: '794px', 
          padding: '48px',
          fontFamily: 'Manrope, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          color: '#2D2D2D',
          background: '#ffffff'
        }}
      >
        {/* Header with Logo */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: '3px solid #1A2B4A'
          }}
        >
          <img 
            src="/logos/iarche-dark.svg" 
            alt="IArche" 
            style={{ height: '36px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
            <p style={{ margin: 0 }}>{billingEntityName}</p>
            <p style={{ margin: '4px 0 0 0' }}>
              Mise à jour : {format(new Date(), 'MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        {/* Arc Decoratif */}
        <div 
          style={{ 
            width: '80px', 
            height: '4px', 
            background: 'linear-gradient(90deg, #1A2B4A 0%, #B04A32 100%)',
            borderRadius: '2px',
            marginBottom: '24px'
          }} 
        />

        {/* CGV Content */}
        <div 
          className="cgv-content"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(cgvContent, {
              ADD_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'div', 'span'],
              ADD_ATTR: ['class', 'style'],
            })
          }}
          style={{
            fontSize: '12px',
            lineHeight: '1.7',
          }}
        />

        {/* Footer */}
        <div 
          style={{ 
            marginTop: '48px',
            paddingTop: '20px',
            borderTop: '1px solid #E8E4DD',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '10px'
          }}
        >
          <p style={{ margin: 0 }}>
            {billingEntityName} — Conditions Générales de Vente — Document confidentiel
          </p>
        </div>

        {/* Inline styles for CGV content */}
        <style>{`
          .cgv-content h1 {
            font-size: 20px;
            font-weight: 700;
            color: #1A2B4A;
            margin: 0 0 8px 0;
            letter-spacing: -0.3px;
          }
          .cgv-content h1 + p {
            margin-top: 0;
            color: #6B7280;
            font-style: italic;
          }
          .cgv-content h2 {
            font-size: 13px;
            font-weight: 700;
            color: #1A2B4A;
            margin: 24px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 6px;
            border-bottom: 2px solid #B04A32;
          }
          .cgv-content h3 {
            font-size: 12px;
            font-weight: 600;
            color: #333;
            margin: 16px 0 6px 0;
          }
          .cgv-content p {
            margin: 8px 0;
            text-align: justify;
          }
          .cgv-content ul, .cgv-content ol {
            margin: 8px 0;
            padding-left: 20px;
          }
          .cgv-content li {
            margin: 4px 0;
          }
          .cgv-content strong {
            font-weight: 600;
            color: #1A2B4A;
          }
        `}</style>
      </div>
    );
  }
);

CGVDocument.displayName = 'CGVDocument';
