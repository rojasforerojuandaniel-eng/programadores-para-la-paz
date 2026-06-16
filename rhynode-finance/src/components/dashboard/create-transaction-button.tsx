"use client";

import { useRouter } from "next/navigation";
import { CreateTransactionSheet } from "./create-transaction-sheet";

export function CreateTransactionButton() {
  const router = useRouter();
  return <CreateTransactionSheet onCreate={() => router.refresh()} />;
}
