/// <reference types="vite/client" />

// Google Tag Manager dataLayer type definition
interface DataLayerEvent {
  event: string;
  [key: string]: any;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}
