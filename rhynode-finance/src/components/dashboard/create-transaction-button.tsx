"use client";

import { useRouter } from "next/navigation";
import { CreateTransactionDialog } from "./create-transaction-dialog";

export function CreateTransactionButton() {
  const router = useRouter();
  return <CreateTransactionDialog onCreate={() => router.refresh()} />;
}
