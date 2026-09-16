/**
 * A unified API client using the native fetch and URL constructor
 * to ensure structural integrity of outbound request paths.
 */
export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const baseUrlStr = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  
  // Ensure the endpoint is treated as a path relative to the base URL's origin
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(path, baseUrlStr);

  return fetch(url.toString(), options);
}
