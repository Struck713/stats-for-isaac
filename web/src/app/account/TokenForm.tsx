"use client";

import { useActionState } from "react";
import { type CreateTokenState, createTokenAction } from "./actions";

export function TokenForm() {
  const [state, action, pending] = useActionState<CreateTokenState, FormData>(createTokenAction, {});
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <label htmlFor="token-name" className="font-isaac text-lg">
          Name
        </label>
        <input id="token-name" name="name" placeholder="My PC" maxLength={40} className="ink-input" />
        <button type="submit" className="ink-button" disabled={pending}>
          {pending ? "Making…" : "Make a token"}
        </button>
      </form>
      {state.error && <p className="text-blood">{state.error}</p>}
      {state.token && (
        <div className="rounded-md border-2 border-dashed border-ink bg-[rgb(255_250_235_/_0.6)] p-3">
          <p className="mb-2">
            Here&apos;s your token. It&apos;s only shown this once. Open the game&apos;s debug console
            (the <kbd>~</kbd> key) and paste:
          </p>
          <code className="block break-all font-mono text-base select-all">sfi token {state.token}</code>
        </div>
      )}
    </div>
  );
}
