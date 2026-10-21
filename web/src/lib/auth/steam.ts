// Steam sign-in uses OpenID 2.0: send the user to Steam, then have Steam confirm the signed
// response it redirects back with (check_authentication) before trusting the claimed id.
const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function callbackUrl(): string {
  return `${appUrl()}/api/auth/steam/callback`;
}

export function steamLoginUrl(): string {
  const params = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl(),
    "openid.realm": appUrl(),
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${OPENID_ENDPOINT}?${params}`;
}

export function parseClaimedId(claimedId: string | null): string | null {
  const m = claimedId?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return m ? m[1] : null;
}

// Returns the SteamID64 if Steam vouches for this callback, otherwise null.
export async function verifySteamCallback(params: URLSearchParams): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  if (params.get("openid.op_endpoint") !== OPENID_ENDPOINT) return null;
  const returnTo = params.get("openid.return_to") ?? "";
  if (returnTo !== callbackUrl() && !returnTo.startsWith(`${callbackUrl()}?`)) return null;
  const steamId = parseClaimedId(params.get("openid.claimed_id"));
  if (!steamId || params.get("openid.identity") !== params.get("openid.claimed_id")) return null;

  const check = new URLSearchParams(params);
  check.set("openid.mode", "check_authentication");
  const res = await fetch(OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: check,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.text();
  return /^is_valid\s*:\s*true\s*$/m.test(body) ? steamId : null;
}
