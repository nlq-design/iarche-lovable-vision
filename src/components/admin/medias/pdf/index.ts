// IArche PDF Brand Components
// High-fidelity static versions of animated brand elements

// SVG-based components (may have rendering issues)
export { PDFLogo, PDFLogoText } from './PDFLogo';
export { PDFGradientBar } from './PDFGradientBar';
export { PDFMeshBackground } from './PDFMeshBackground';
export { PDFArches } from './PDFArches';

// Base64 SVG components (reliable rendering) - RECOMMENDED
export { 
  PDFImageLogo, 
  PDFImageBar, 
  PDFImageBarSized, 
  PDFBarSizes,
  PDFPatternBackground,
  PDFArchesDecoration,
  PDFLogoSources,
  PDFBarSources,
} from './PDFImageAssets';

// Canalisation lines (matching hero animation frozen at 6s)
export { 
  PDFCanalisationLines, 
  PDFCanalisationLinesSimple 
} from './PDFCanalisationLines';

// Design tokens
export { 
  IARCHE_COLORS, 
  TYPOGRAPHY, 
  PDF_FORMATS, 
  BAR_SIZES, 
  LOGO_SIZES 
} from './tokens';
