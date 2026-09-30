/// <reference types="vite/client" />

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

declare module "*.css?inline" {
  const content: string;
  export default content;
}

// Replaced at build time by Vite `define` (see vite.config.ts).
declare const __WIDGET_VERSION__: string;

// True only in the self-mounting <script> (IIFE) build (see vite.config.ts).
declare const __WIDGET_AUTOMOUNT__: boolean;
