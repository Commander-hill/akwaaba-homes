/**
 * Safely parse JSON values with defensive fallback handling.
 * Prevents 500 internal server errors when handling legacy or malformed database fields.
 */
export const safeJsonParse = <T = any>(val: any, fallback: T = [] as any): T => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    // If it's a raw non-JSON string (e.g. a direct single Cloudinary URL string), wrap it in an array if fallback is an array
    if (typeof val === 'string' && Array.isArray(fallback)) {
      return [val] as any;
    }
    return fallback;
  }
};
