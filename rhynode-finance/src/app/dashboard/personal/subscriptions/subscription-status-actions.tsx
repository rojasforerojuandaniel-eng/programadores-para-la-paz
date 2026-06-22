"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ExternalLink,
  Link2,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING_CANCELLATION"
  | "CANCELED";

interface SubscriptionStatusActionsProps {
  id: string;
  status: SubscriptionStatus;
  cancellationUrl: string | null;
}

export function SubscriptionStatusActions({
  id,
  status,
  cancellationUrl,
}: SubscriptionStatusActionsProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.subscriptions");
  const [loading, setLoading] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [url, setUrl] = useState(cancellationUrl || "");

  async function updateStatus(
    newStatus: SubscriptionStatus,
    urlToSave?: string
  ): Promise<boolean> {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          ...(urlToSave !== undefined ? { cancellationUrl: urlToSave } : {}),
        }),
      });
      if (!res.ok) {
        toast.error(t("actions.updateErrorToast"));
        return false;
      }
      router.refresh();
      toast.success(
        newStatus === "PENDING_CANCELLATION"
          ? t("actions.markedCancelToast")
          : newStatus === "CANCELED"
            ? t("actions.canceledToast")
            : t("actions.reactivatedToast")
      );
      return true;
    } catch {
      toast.error(t("actions.networkErrorToast"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await updateStatus("PENDING_CANCELLATION");
    if (ok && cancellationUrl) {
      window.open(cancellationUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault();
    await updateStatus(status, url || undefined);
    setUrlDialogOpen(false);
  }

  if (status === "CANCELED") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateStatus("ACTIVE")}
        disabled={loading}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t("actions.reactivate")}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "ACTIVE" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            aria-label={t("actions.markForCancelAriaLabel")}
          >
            {cancellationUrl ? (
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {t("actions.cancel")}
          </Button>
          <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {t("actions.editLink")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="heading-card">
                  {t("actions.cancelLinkTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("actions.cancelLinkDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveUrl} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor={`cancel-url-${id}`}>{t("actions.urlLabel")}</Label>
                  <Input
                    id={`cancel-url-${id}`}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://netflix.com/cancel"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setUrlDialogOpen(false)}
                  >
                    {t("actions.close")}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {t("actions.save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      {status === "PENDING_CANCELLATION" && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => updateStatus("CANCELED")}
            disabled={loading}
            aria-label={t("actions.confirmCanceledAriaLabel")}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t("actions.confirmCanceled")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateStatus("ACTIVE")}
            disabled={loading}
            aria-label={t("actions.reactivateAriaLabel")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("actions.reactivate")}
          </Button>
        </>
      )}
    </div>
  );
}
