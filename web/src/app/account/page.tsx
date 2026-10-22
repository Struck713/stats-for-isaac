import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Paper, SectionTitle } from "@/components/isaac/Paper";
import { getCurrentUser } from "@/lib/auth/session";
import { listApiTokens } from "@/lib/auth/tokens";
import { revokeTokenAction } from "./actions";
import { TokenForm } from "./TokenForm";

export const metadata: Metadata = { title: "Account" };

// Rolling release that .github/workflows/mod-release.yml re-publishes on every push to main.
const MOD_DOWNLOAD_URL =
  "https://github.com/Struck713/stats-for-isaac/releases/download/mod-latest/statsforisaac.zip";

const dateFormat =new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function AccountPage() {
  return (
    <Suspense fallback={<Paper>Loading…</Paper>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Paper tilt={-0.5} className="text-center">
        <h1 className="text-4xl">Account</h1>
        <p className="my-4 text-lg">Sign in to get a token for the mod.</p>
        <a href="/api/auth/steam" className="ink-button">
          Sign in through Steam
        </a>
      </Paper>
    );
  }
  const tokens = await listApiTokens(user.id);
  return (
    <>
      <Paper tilt={-0.4}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl">{user.personaName}</h1>
          <div className="flex gap-2">
            <Link href={`/u/${user.steamId}`} className="ink-button">
              My runs
            </Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="ink-button">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </Paper>

      <Paper tilt={0.3}>
        <SectionTitle>Setting up the mod</SectionTitle>
        <ol className="list-decimal space-y-3 pl-6 text-lg">
          <li>
            Download the latest version of the mod and extract it into the game&apos;s <code>mods</code>{" "}
            folder. You should end up with a <code>statsforisaac</code> folder inside <code>mods</code>.
            <div className="mt-2">
              <a href={MOD_DOWNLOAD_URL} className="ink-button" download>
                Download the mod
              </a>
            </div>
          </li>
          <li>
            In Steam, right-click the game, open <em>Properties</em>, and add <code>--luadebug</code> to the
            launch options. The mod needs it to reach the internet.
            <p className="mt-1 text-base text-blood">
              <code>--luadebug</code> lets <strong>every</strong> mod you have installed read and write files and
              use the network, not just this one. Only use it with mods you trust.
            </p>
          </li>
          <li>Make a token below, then paste the command it gives you into the game&apos;s debug console.</li>
          <li>
            Play. Runs upload when they end. Type <code>sfi status</code> in the console to check on it.
          </li>
        </ol>
      </Paper>

      <Paper tilt={-0.2}>
        <SectionTitle>Tokens</SectionTitle>
        <p className="mb-4">
          A token lets the mod add runs to your account. It can&apos;t do anything else. Revoke one if you
          think it got out.
        </p>
        {tokens.length > 0 && (
          <ul className="mb-5">
            {tokens.map((t) => (
              <li key={t.id} className="ledger-row flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-isaac text-lg">{t.name}</span>{" "}
                  <code className="text-ink-soft">{t.prefix}…</code>
                  <span className="block text-sm text-ink-soft">
                    Made {dateFormat.format(t.createdAt)}
                    {t.lastUsedAt ? ` · last used ${dateFormat.format(t.lastUsedAt)}` : " · never used"}
                  </span>
                </span>
                <form action={revokeTokenAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="ink-button" data-variant="danger">
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <TokenForm />
      </Paper>
    </>
  );
}
