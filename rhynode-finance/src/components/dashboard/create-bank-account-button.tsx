"use client";

import { useRouter } from "next/navigation";
import { CreateBankAccountDialog } from "./create-bank-account-dialog";

export function CreateBankAccountButton() {
  const router = useRouter();
  return <CreateBankAccountDialog onCreate={() => router.refresh()} />;
}
