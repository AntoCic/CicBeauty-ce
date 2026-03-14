// ! non toccare questo file perche e autogenerato con firebase-secrets-cli

import { defineSecret } from 'firebase-functions/params';

export const secret = {
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    HUBCORTEX_API_KEY: 'HUBCORTEX_API_KEY',
} as const;

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
export const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = defineSecret('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
export const HUBCORTEX_API_KEY = defineSecret('HUBCORTEX_API_KEY');
