"use client";

import { SignUp } from "@clerk/nextjs";

export function SignUpForm() {
  return <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />;
}
