import { jsPDF } from 'jspdf';
import fs from 'fs';






const A_ITEMS = [
  { id: 'A1', label: 'Migration M4 + tables invite_codes & profiles créées', status: 'CONFORME' },
  { id: 'A2', label: 'Colonnes invite_codes + RLS cockpit_admin only', status: 'CONFORME' },
  { id: 'A3', label: 'Colonnes profiles + RLS owner/admin', status: 'CONFORME' },
  { id: 'A4', label: 'Trigger on_auth_user_created -> handle_new_user (SECURITY DEFINER)', status: 'CONFORME' },
  { id: 'A5', label: 'handle_new_user : valid invite, workspace + member, profile init', status: 'CONFORME' },
  { id: 'A6', label: 'get_crm_graph : workspace_members check + JOIN partners', status: 'CONFORME' },
  { id: 'A7', label: 'Edge fn validate-invite-code publique (verify_jwt=false)', status: 'CONFORME' },
  { id: 'A8', label: 'config.toml : bloc validate-invite-code déclaré', status: 'CONFORME' },
];

const B_ITEMS = [
  { id: 'B1', label: 'useAuth étendu : signUp, signInWithGoogle, resetPassword, updatePassword', status: 'CONFORME' },
  { id: 'B2', label: 'Pattern onAuthStateChange AVANT getSession', status: 'CONFORME' },
  { id: 'B3', label: 'Page Signup : validation regex + invocation validate-invite-code', status: 'CONFORME' },
  { id: 'B4', label: 'Page Login : email/password + Google OAuth', status: 'CONFORME' },
  { id: 'B5', label: 'Page AuthCallback : redirect après OAuth', status: 'CONFORME' },
  { id: 'B6', label: 'Page ResetPassword : reset + update flows', status: 'CONFORME' },
  { id: 'B7', label: 'Page Onboarding : update profiles.onboarded_at', status: 'CONFORME' },
  { id: 'B8', label: 'Guards : !user -> /login (Admin, Cockpit, Vivier)', status: 'CONFORME' },
  { id: 'B9', label: '5 routes publiques lazy-loaded dans App.tsx', status: 'CONFORME' },
  { id: 'B10', label: 'Design system : 0 hex hardcodé, tokens HSL stricts', status: 'CONFORME' },
  { id: 'B11', label: 'TypeScript : 0 nouvelle erreur (hors préexistantes)', status: 'CONFORME' },
];

const COLORS = {
  blancCasse: [250, 249, 247] ,
  nightBlue: [26, 43, 74] ,
  terracotta: [176, 74, 50] ,
  textDark: [30, 30, 35] ,
  textMuted: [110, 110, 120] ,
  borderLight: [220, 218, 213] ,
  conformeBg: [220, 240, 225] ,
  conformeText: [30, 100, 60] ,
  ecartBg: [255, 240, 215] ,
  ecartText: [150, 90, 20] ,
  bloquantBg: [250, 220, 220] ,
  bloquantText: [160, 40, 40] ,
};

const statusStyle = (status) => {
  switch (status) {
    case 'CONFORME':
      return { bg: COLORS.conformeBg, text: COLORS.conformeText };
    case 'ÉCART':
      return { bg: COLORS.ecartBg, text: COLORS.ecartText };
    case 'BLOQUANT':
      return { bg: COLORS.bloquantBg, text: COLORS.bloquantText };
  }
};

const generateM4ComplianceReport = () => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;

  const fillBackground = () => {
    doc.setFillColor(...COLORS.blancCasse);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  fillBackground();

  // Header band
  doc.setFillColor(...COLORS.nightBlue);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(...COLORS.blancCasse);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Rapport de conformité M4', marginX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Authentification publique + Onboarding + Hardening RPC', marginX, 21);

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(9);
  doc.text(`Généré le ${dateStr} à ${timeStr}`, marginX, 27);

  // Synthesis box
  let cursorY = 42;
  const all = [...A_ITEMS, ...B_ITEMS];
  const total = all.length;
  const conformes = all.filter((i) => i.status === 'CONFORME').length;
  const ecarts = all.filter((i) => i.status === 'ÉCART').length;
  const bloquants = all.filter((i) => i.status === 'BLOQUANT').length;

  doc.setDrawColor(...COLORS.borderLight);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, cursorY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(...COLORS.nightBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Synthèse', marginX + 4, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textDark);
  doc.text(
    `Total: ${total} contrôles  |  Conformes: ${conformes}  |  Écarts: ${ecarts}  |  Bloquants: ${bloquants}`,
    marginX + 4,
    cursorY + 13,
  );

  const verdict =
    bloquants === 0 && ecarts === 0
      ? 'M4 CONFORME'
      : bloquants > 0
      ? 'M4 NON CONFORME'
      : 'M4 CONFORME AVEC ÉCARTS';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.terracotta);
  doc.text(`Verdict: ${verdict}`, marginX + 4, cursorY + 19);

  cursorY += 30;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - 18) {
      doc.addPage();
      fillBackground();
      cursorY = 20;
    }
  };

  const drawSection = (title: string, items) => {
    ensureSpace(14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.nightBlue);
    doc.text(title, marginX, cursorY);
    doc.setDrawColor(...COLORS.terracotta);
    doc.setLineWidth(0.6);
    doc.line(marginX, cursorY + 1.5, marginX + 35, cursorY + 1.5);
    cursorY += 7;

    items.forEach((item) => {
      const rowHeight = 11;
      ensureSpace(rowHeight + 2);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginX, cursorY, contentWidth, rowHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.nightBlue);
      doc.text(item.id, marginX + 3, cursorY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textDark);
      const labelLines = doc.splitTextToSize(item.label, contentWidth - 50);
      doc.text(labelLines[0], marginX + 14, cursorY + 7);

      const style = statusStyle(item.status);
      const pillW = 28;
      const pillX = marginX + contentWidth - pillW - 3;
      const pillY = cursorY + 2.5;
      doc.setFillColor(...style.bg);
      doc.roundedRect(pillX, pillY, pillW, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...style.text);
      doc.text(item.status, pillX + pillW / 2, pillY + 4, { align: 'center' });

      cursorY += rowHeight + 1.5;
    });

    cursorY += 4;
  };

  drawSection('A. Backend & Base de données (A1–A8)', A_ITEMS);
  drawSection('B. Frontend & Auth (B1–B11)', B_ITEMS);

  // Risks
  ensureSpace(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.nightBlue);
  doc.text('Risques résiduels à trancher', marginX, cursorY);
  doc.setDrawColor(...COLORS.terracotta);
  doc.setLineWidth(0.6);
  doc.line(marginX, cursorY + 1.5, marginX + 50, cursorY + 1.5);
  cursorY += 8;

  const risks = [
    "Activation manuelle Google OAuth (Dashboard Cloud + redirect URLs).",
    "Test d'accès non-admin post-onboarding (workspace RLS).",
    "Décision sur la confirmation email obligatoire en phase Beta.",
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.textDark);
  risks.forEach((r) => {
    ensureSpace(7);
    doc.text(`•  ${r}`, marginX + 2, cursorY);
    cursorY += 6;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('IArche  |  Rapport interne M4', marginX, pageHeight - 7);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  const filename = `m4-compliance-${now.toISOString().slice(0, 10)}.pdf`;
  fs.writeFileSync('/tmp/m4-test.pdf', Buffer.from(doc.output('arraybuffer')));
};

generateM4ComplianceReport();