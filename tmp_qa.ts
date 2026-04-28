import fs from 'fs';
// Patch jsdom-less env: stub document.createElement for jspdf save?
// jsPDF save uses URL.createObjectURL only when saving via blob; in node, we'll call output('arraybuffer')
import jsPDF from 'jspdf';

// Re-implement minimally: import the lib but override save by monkeypatching
const orig = jsPDF.prototype.save;
jsPDF.prototype.save = function(filename: string) {
  fs.writeFileSync('/tmp/m4-test.pdf', Buffer.from(this.output('arraybuffer')));
  return this;
};

const { generateM4ComplianceReport } = await import('./src/lib/m4ComplianceReport.ts');
generateM4ComplianceReport();
console.log('OK');
