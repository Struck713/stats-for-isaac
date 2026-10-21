import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <a href="/api/auth/steam" className="ink-button">
        Sign in through Steam
      </a>
    );
  }
  return (
    <nav className="flex items-center gap-3">
      <Link href={`/u/${user.steamId}`} className="flex items-center gap-2 font-isaac text-lg text-paper hover:underline">
        {user.avatarUrl && (
          // Steam avatars come from Steam's CDN; a plain img avoids configuring remote images.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" width={32} height={32} className="rounded border-2 border-paper" />
        )}
        <span className="hidden sm:inline">{user.personaName}</span>
      </Link>
      <Link href="/account" className="ink-button">
        Account
      </Link>
    </nav>
  );
}
