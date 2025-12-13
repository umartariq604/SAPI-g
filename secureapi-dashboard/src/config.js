// Prefer build-time environment variables, fallback to current host
const envApiUrl = process.env.REACT_APP_API_URL;
const envSocketUrl = process.env.REACT_APP_SOCKET_URL;

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

// Use nullish coalescing so empty string ('') is respected (for relative paths)
const API_URL = envApiUrl ?? `${protocol}//${host}:5001`;
const SOCKET_URL = envSocketUrl ?? `${protocol}//${host}:5001`;

export { API_URL, SOCKET_URL };
