// secrets.ts
// Usage: import { getSecret } from './secrets';

export function getSecret(key: string): string | undefined {
  // In production (Cloud Functions), use process.env directly (set via Firebase config)
  // In local development, dotenv will populate process.env
  return process.env[key];
}

// Example usage:
// const apiKey = getSecret('ALPHA_VANTAGE_API_KEY'); 