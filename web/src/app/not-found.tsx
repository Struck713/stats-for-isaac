import Link from "next/link";
import { Paper } from "@/components/isaac/Paper";

export default function NotFound() {
  return (
    <Paper tilt={-1} className="mx-auto max-w-lg text-center">
      <h1 className="text-5xl">I AM ERROR</h1>
      <p className="my-4 text-lg">There&apos;s nothing in this room.</p>
      <Link href="/" className="ink-button">
        Back to the start
      </Link>
    </Paper>
  );
}
