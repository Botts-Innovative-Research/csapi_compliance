import strings from './en.json';

/** Get a localized string by key. Supports {placeholder} interpolation. */
export function t(key: string, params?: Record<string, string | number>): string {
  let str = (strings as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
