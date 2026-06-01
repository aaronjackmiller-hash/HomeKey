const PUBLIC_CONFIG_GLOBAL = '__HOMEKEY_PUBLIC_CONFIG__';

export const getPublicConfigValue = (key) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return '';

  if (typeof window !== 'undefined') {
    const runtimeConfig = window[PUBLIC_CONFIG_GLOBAL];
    const runtimeValue = runtimeConfig && runtimeConfig[normalizedKey];
    if (runtimeValue != null && String(runtimeValue).trim()) {
      return String(runtimeValue).trim();
    }
  }

  const buildValue = process.env[normalizedKey];
  return buildValue == null ? '' : String(buildValue).trim();
};
