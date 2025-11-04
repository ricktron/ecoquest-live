import { env } from '../env';

export const TROPHIES_ON = env.VITE_FEATURE_TROPHIES === 'true';
export const ENABLE_ADMIN = env.VITE_ENABLE_ADMIN === 'true';
