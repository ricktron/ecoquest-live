export const TROPHIES_ON =
  String(import.meta.env.VITE_FEATURE_TROPHIES ?? '').toLowerCase() === 'true';

export const ENABLE_ADMIN =
  String(import.meta.env.VITE_ENABLE_ADMIN ?? '').toLowerCase() === 'true';
