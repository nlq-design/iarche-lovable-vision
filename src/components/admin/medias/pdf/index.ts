// IArche PDF Brand Components - v4.0
// High-fidelity static versions of animated brand elements

// SVG-based components
export { PDFLogo, PDFLogoText } from './PDFLogo';
export { PDFLogoArc } from './PDFLogoArc';
export { PDFMeshBackground } from './PDFMeshBackground';
export { PDFArches } from './PDFArches';

// Logo + Arc (Charte 4.0)
export { PDFLogoWithArc } from './PDFLogoWithArc';

// Legacy exports - deprecated, use PDFLogoArc instead
export { PDFGradientBar } from './PDFGradientBar';
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
