"use server";

import { redirect } from "next/navigation";
import { checkPasscode, endSession, startSession } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!checkPasscode(passcode)) {
    redirect("/login?error=1");
  }
  await startSession();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
