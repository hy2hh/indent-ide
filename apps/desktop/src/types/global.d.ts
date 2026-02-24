import type { IntentIdeApi } from '../../../electron/preload.js';

declare global {
  interface Window {
    intentIde: IntentIdeApi;
  }
}

export {};
