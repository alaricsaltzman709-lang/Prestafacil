const shim = typeof window !== 'undefined' ? window.fetch : globalThis.fetch;
export default shim;
export const fetch = shim;
export const Request = typeof window !== 'undefined' ? window.Request : globalThis.Request;
export const Response = typeof window !== 'undefined' ? window.Response : globalThis.Response;
export const Headers = typeof window !== 'undefined' ? window.Headers : globalThis.Headers;
