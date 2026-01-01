// IArche PDF Brand Components - v4.0
// High-fidelity static versions of animated brand elements
// v4.0: Suppression du fond quadrillé (mesh) et barres legacy

// SVG-based components
export { PDFLogo, PDFLogoText } from './PDFLogo';
export { PDFLogoArc } from './PDFLogoArc';
export { PDFArches } from './PDFArches';

// Logo + Arc (Charte 4.0) - RECOMMENDED
export { PDFLogoWithArc } from './PDFLogoWithArc';

// Base64 SVG components (reliable rendering) - RECOMMENDED
export { 
  PDFImageLogo, 
  PDFImageBar, 
  PDFImageBarSized, 
  PDFBarSizes,
  PDFArchesDecoration,
  PDFLogoSources,
  PDFBarSources,
} from './PDFImageAssets';

// Design tokens
export { 
  IARCHE_COLORS, 
  TYPOGRAPHY, 
  PDF_FORMATS, 
  BAR_SIZES, 
  LOGO_SIZES,
  LOGO_SIZES_PDF,
} from './tokens';
