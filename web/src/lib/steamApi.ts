import "server-only";

export interface SteamProfile {
  personaName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
}

// Looks up a player's public profile. Uses the Web API when STEAM_API_KEY is set, otherwise (or if
// that fails) the public community profile XML, which needs no key. If both fail the SteamID
// stands in for the name.
export async function getSteamProfile(steamId: string): Promise<SteamProfile> {
  const fallback = { personaName: steamId, avatarUrl: null, profileUrl: `https://steamcommunity.com/profiles/${steamId}` };
  return (await fromWebApi(steamId, fallback)) ?? (await fromCommunityXml(steamId, fallback)) ?? fallback;
}

async function fromWebApi(steamId: string, fallback: SteamProfile): Promise<SteamProfile | null> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${steamId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: { players?: { personaname?: string; avatarfull?: string; profileurl?: string }[] };
    };
    const player = json.response?.players?.[0];
    if (!player?.personaname) return null;
    return {
      personaName: player.personaname,
      avatarUrl: player.avatarfull ?? null,
      profileUrl: player.profileurl ?? fallback.profileUrl,
    };
  } catch {
    return null;
  }
}

async function fromCommunityXml(steamId: string, fallback: SteamProfile): Promise<SteamProfile | null> {
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, { cache: "no-store" });
    if (!res.ok) return null;
    const xml = await res.text();
    const field = (tag: string) =>
      xml.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`))?.slice(1).find(Boolean)?.trim();
    const personaName = field("steamID");
    if (!personaName) return null;
    return { personaName, avatarUrl: field("avatarFull") ?? null, profileUrl: fallback.profileUrl };
  } catch {
    return null;
  }
}
