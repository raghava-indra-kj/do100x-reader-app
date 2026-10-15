// D2's packaged worker uses dynamic code and WASM. Confine it to the opaque
// sandbox; privileged extension pages never allow eval or remote scripts.
export const extensionCsp = "script-src 'self'; object-src 'none'; base-uri 'none'";
export const sandboxCsp = "sandbox allow-scripts allow-downloads allow-popups; default-src 'none'; script-src 'self' 'unsafe-eval'; worker-src blob:; connect-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src https: http: data: blob:; media-src https: http: blob:; frame-src https: http:; object-src 'none'; base-uri 'none'; form-action 'none'";
