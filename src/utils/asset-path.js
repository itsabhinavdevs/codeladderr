// Assets physically live under public/assets/. In production, netlify.toml
// redirects "/assets/*" to "/public/assets/*", so a root-relative path works
// as written. Plain local dev (`npx serve .`) has no rewrite rules, so the
// real path must be spelled out explicitly. Deciding by hostname only (never
// by the current pathname) keeps this correct no matter which page calls it.
export function assetUrl(path) {
  const isLocalDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const cleanPath = path.replace(/^\//, "");
  return isLocalDev ? `/public/${cleanPath}` : `/${cleanPath}`;
}
