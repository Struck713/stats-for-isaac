"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createApiToken, revokeApiToken } from "@/lib/auth/tokens";

export type CreateTokenState = { token?: string; error?: string };

export async function createTokenAction(_prev: CreateTokenState, form: FormData): Promise<CreateTokenState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const name = String(form.get("name") ?? "").trim().slice(0, 40) || "My PC";
  const token = await createApiToken(user.id, name);
  refresh();
  return { token };
}

export async function revokeTokenAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) await revokeApiToken(user.id, id);
  refresh();
}
