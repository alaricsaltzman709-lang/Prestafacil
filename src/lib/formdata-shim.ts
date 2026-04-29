// Shim to replace formdata-polyfill with native FormData
const FormDataShim = typeof window !== 'undefined' ? window.FormData : globalThis.FormData;
export default FormDataShim;
export { FormDataShim as FormData };
