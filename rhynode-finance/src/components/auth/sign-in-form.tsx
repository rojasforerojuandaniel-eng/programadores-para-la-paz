"use client";

import { SignIn } from "@clerk/nextjs";

export function SignInForm() {
  return <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />;
}
