import { jsPDF } from 'jspdf';
import fs from 'fs';

// Inline a minimal version mirroring the lib for QA
const code = fs.readFileSync('src/lib/m4ComplianceReport.ts', 'utf8');
// Strip TS types and replace save() to write file
const js = code
  .replace(/^import jsPDF from 'jspdf';$/m, '')
  .replace(/type Status[^;]+;/, '')
  .replace(/interface ComplianceItem \{[^}]+\}/, '')
  .replace(/: ComplianceItem\[\]/g, '')
  .replace(/: Status/g, '')
  .replace(/: \[number, number, number\]/g, '')
  .replace(/as \[number, number, number\]/g, '')
  .replace(/export const generateM4ComplianceReport = \(\): void =>/, 'const generateM4ComplianceReport = () =>')
  .replace(/doc\.save\(filename\);/, "fs.writeFileSync('/tmp/m4-test.pdf', Buffer.from(doc.output('arraybuffer')));");

fs.writeFileSync('/tmp/m4_inline.mjs', `import { jsPDF } from 'jspdf';\nimport fs from 'fs';\n${js}\ngenerateM4ComplianceReport();`);
