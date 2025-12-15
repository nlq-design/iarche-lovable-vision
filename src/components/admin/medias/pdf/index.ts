// IArche PDF Brand Components
// High-fidelity static versions of animated brand elements

// SVG-based components (may have rendering issues)
export { PDFLogo, PDFLogoText } from './PDFLogo';
export { PDFGradientBar } from './PDFGradientBar';
export { PDFLogoArc } from './PDFLogoArc';
export { PDFMeshBackground } from './PDFMeshBackground';
export { PDFArches } from './PDFArches';

// Logo + Barre/Arc obligatoire (Charte 4.0)
export { PDFLogoWithBar } from './PDFLogoWithBar';

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

// Design tokens
export { 
  IARCHE_COLORS, 
  TYPOGRAPHY, 
  PDF_FORMATS, 
  BAR_SIZES, 
  LOGO_SIZES,
  LOGO_SIZES_PDF,
} from './tokens';
