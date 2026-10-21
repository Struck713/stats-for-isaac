import { Suspense } from "react";
import { Paper, SectionTitle } from "@/components/isaac/Paper";
import { RunList } from "@/components/isaac/RunList";
import { listRecentRuns } from "@/lib/data";

export default async function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Paper tilt={-0.6} className="text-center">
        <h1 className="text-4xl sm:text-5xl">Your runs, floor by floor</h1>
        <hr className="ink-rule mx-auto my-4 w-1/2" />
        <p className="mx-auto max-w-2xl text-lg">
          The Stats for Isaac mod records every run: the map you explored, the items you took, the
          bosses you fought and what finally killed you. Sign in through Steam, give the mod your
          token, and every run gets its own page you can share.
        </p>
        <Suspense>
          <SignInError searchParams={searchParams} />
        </Suspense>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href="/api/auth/steam" className="ink-button">
            Sign in through Steam
          </a>
          <a href="/account" className="ink-button">
            Set up the mod
          </a>
        </div>
      </Paper>

      <Paper tilt={0.4}>
        <SectionTitle>Latest runs</SectionTitle>
        <Suspense fallback={<p className="italic">Digging through the basement…</p>}>
          <RecentRuns />
        </Suspense>
      </Paper>
    </>
  );
}

async function SignInError({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "signin") return null;
  return <p className="mt-3 text-blood">Steam sign-in didn&apos;t go through. Please try again.</p>;
}

async function RecentRuns() {
  const runs = await listRecentRuns(15);
  return <RunList runs={runs} showOwner />;
}
