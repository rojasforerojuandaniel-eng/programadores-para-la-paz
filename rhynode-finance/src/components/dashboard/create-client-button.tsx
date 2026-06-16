"use client";

import { useRouter } from "next/navigation";
import { CreateClientDialog } from "./create-client-dialog";

export function CreateClientButton() {
  const router = useRouter();
  return <CreateClientDialog onCreate={() => router.refresh()} />;
}
