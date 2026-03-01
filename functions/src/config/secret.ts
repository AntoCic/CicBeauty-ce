// ! non toccare questo file perche e autogenerato con firebase-secrets-cli

import { defineSecret } from 'firebase-functions/params';

export const secret = {
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    HUBCORTEX_API_KEY: 'HUBCORTEX_API_KEY',
} as const;

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const HUBCORTEX_API_KEY = defineSecret('HUBCORTEX_API_KEY');
