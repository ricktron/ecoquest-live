import { getFeature } from './config';

type FlagSource = 'default' | 'env' | 'window' | 'url';

type TickerFlagDetails = {
  effective: boolean;
  source: FlagSource;
  raw: {
    importMeta?: string;
    windowEnv?: string;
  };
};

const FLAG_NAME = 'VITE_FEATURE_TICKERS';
let cachedTickerFlag: TickerFlagDetails | null = null;

function computeTickerFlag(): TickerFlagDetails {
  if (cachedTickerFlag) {
    return cachedTickerFlag;
  }

  const importMetaRaw = (import.meta as any)?.env?.[FLAG_NAME];
  const windowEnvRaw = typeof window !== 'undefined' ? (window as any).__ENV?.[FLAG_NAME] : undefined;

  let source: FlagSource = 'default';
  let flagValue = getFeature(FLAG_NAME);

  if (importMetaRaw != null) {
    source = 'env';
  } else if (windowEnvRaw != null) {
    source = 'window';
  }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('tickers');
    if (override) {
      const normalized = override.trim().toLowerCase();
      if (normalized === 'on') {
        flagValue = '1';
        source = 'url';
      } else if (normalized === 'off') {
        flagValue = '0';
        source = 'url';
      }
    }
  }

  cachedTickerFlag = {
    effective: flagValue === '1',
    source,
    raw: {
      importMeta: importMetaRaw != null ? String(importMetaRaw) : undefined,
      windowEnv: windowEnvRaw != null ? String(windowEnvRaw) : undefined,
    },
  };

  return cachedTickerFlag;
}

export function isTickersEnabled(): boolean {
  return computeTickerFlag().effective;
}

export function getTickersFlagDetails(): TickerFlagDetails {
  return computeTickerFlag();
}
