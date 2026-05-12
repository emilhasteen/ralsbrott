// SmartDok auth handshake only. Never calls `/Authorize/ApiToken/Renew`
// (that endpoint rotates and invalidates the access token).
const BASE = "https://api.smartdok.se";

let cachedJwt = null;
let cachedExpiry = 0;

function decodeJwtExpiry(jwt) {
  try {
    const payload = jwt.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const data = JSON.parse(json);
    return data.exp ? data.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function exchangeToken(accessToken) {
  const r = await fetch(`${BASE}/Authorize/ApiToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ Token: accessToken }),
  });
  if (!r.ok) {
    throw new Error(`SmartDok auth failed: ${r.status}`);
  }
  const raw = (await r.text()).trim();
  return raw.replace(/^"|"$/g, "");
}

async function getJwt(env) {
  const now = Date.now();
  if (cachedJwt && now < cachedExpiry - 30_000) return cachedJwt;
  if (!env.SMARTDOK_ACCESS_TOKEN) {
    throw new Error("SMARTDOK_ACCESS_TOKEN env var is not set");
  }
  cachedJwt = await exchangeToken(env.SMARTDOK_ACCESS_TOKEN);
  cachedExpiry = decodeJwtExpiry(cachedJwt) || now + 50 * 60 * 1000;
  return cachedJwt;
}

export async function smartdokFetch(env, path) {
  let jwt = await getJwt(env);
  const doFetch = (token) =>
    fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

  let r = await doFetch(jwt);
  if (r.status === 401) {
    cachedJwt = null;
    cachedExpiry = 0;
    jwt = await getJwt(env);
    r = await doFetch(jwt);
  }
  return r;
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(status, message) {
  return jsonResponse({ error: message }, { status });
}
