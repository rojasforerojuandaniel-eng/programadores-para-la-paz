"use client";

import { toast } from "sonner";

const DB_NAME = "rhynode-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

export type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface QueuedMutation {
  id: string;
  url: string;
  method: MutationMethod;
  body: unknown;
  headers?: Record<string, string>;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getQueueDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Offline queue only runs in browser"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
  return dbPromise;
}

export async function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">): Promise<void> {
  const db = await getQueueDB();
  const item: QueuedMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(item);
    request.onsuccess = () => {
      toast.info("Sin conexión: acción guardada. Se sincronizará al recuperarla.");
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to enqueue mutation"));
  });
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read queue"));
  });
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to remove mutation"));
  });
}

export async function processQueue(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const mutations = await getQueuedMutations();
  if (mutations.length === 0) return;

  const toastId = toast.loading(`Sincronizando ${mutations.length} acción(es)...`);
  let successCount = 0;
  let failCount = 0;

  for (const mutation of mutations.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          "Content-Type": "application/json",
          ...(mutation.headers ?? {}),
        },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });
      if (res.ok) {
        await removeMutation(mutation.id);
        successCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  toast.dismiss(toastId);
  if (successCount > 0) {
    toast.success(`${successCount} acción(es) sincronizada(s).`);
  }
  if (failCount > 0) {
    toast.error(`${failCount} acción(es) no se pudieron sincronizar. Reintentaremos más tarde.`);
  }
}

export function registerOfflineQueue(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void processQueue();
  });
}

export async function executeMutation(
  url: string,
  method: MutationMethod,
  body: unknown,
  options?: {
    headers?: Record<string, string>;
    onSuccess?: () => void | Promise<void>;
    onError?: (error: Error) => void;
  },
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueMutation({ url, method, body, headers: options?.headers });
    options?.onSuccess?.();
    return;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Request failed with ${res.status}`);
    }
    await options?.onSuccess?.();
  } catch (error) {
    if (error instanceof TypeError && typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueMutation({ url, method, body, headers: options?.headers });
      options?.onSuccess?.();
      return;
    }
    const err = error instanceof Error ? error : new Error("Unknown error");
    options?.onError?.(err);
    throw err;
  }
}
