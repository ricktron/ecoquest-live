import { env } from '../env';

export const DEFAULT_ASSIGNMENT_ID = env.VITE_DEFAULT_ASSIGNMENT_ID;
export const TROPHIES_ENABLED = env.VITE_FEATURE_TROPHIES === 'true';
export const ADMIN_ENABLED = env.VITE_ENABLE_ADMIN === 'true';
