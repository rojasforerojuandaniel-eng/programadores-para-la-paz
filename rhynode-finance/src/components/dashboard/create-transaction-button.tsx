"use client";

import { useRouter } from "next/navigation";
import { CreateTransactionSheet } from "./create-transaction-sheet";

interface CreateTransactionButtonProps {
  defaultOpen?: boolean;
}

export function CreateTransactionButton({ defaultOpen }: CreateTransactionButtonProps) {
  const router = useRouter();
  return (
    <CreateTransactionSheet
      onCreate={() => router.refresh()}
      defaultOpen={defaultOpen}
    />
  );
}
