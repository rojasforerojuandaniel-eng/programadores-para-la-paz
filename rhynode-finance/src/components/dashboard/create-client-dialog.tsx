"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { trackEvent } from "@/lib/analytics";
import { executeMutation } from "@/lib/offline-queue";

export function CreateClientDialog({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("dashboard.clients");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    taxId: "",
    phone: "",
    city: "",
    country: "CO",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await executeMutation(
        "/api/clients",
        "POST",
        form,
        {
          onSuccess: () => {
            trackEvent("client_created", { country: form.country });
            setOpen(false);
            setForm({ name: "", email: "", taxId: "", phone: "", city: "", country: "CO" });
            onCreate();
          },
          onError: (err) => {
            toast.error(err.message || t("createDialog.createError"));
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("createDialog.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">{t("form.name")}</Label>
            <Input
              id="client-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-email">{t("form.email")}</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("form.emailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-taxId">{t("form.taxId")}</Label>
              <Input
                id="client-taxId"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder={t("form.taxIdPlaceholder")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-phone">{t("form.phone")}</Label>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("form.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-city">{t("form.city")}</Label>
              <Input
                id="client-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t("form.cityPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-country">{t("form.country")}</Label>
            <Select
              value={form.country}
              onValueChange={(v) => setForm({ ...form, country: v })}
            >
              <SelectTrigger id="client-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CO">Colombia</SelectItem>
                <SelectItem value="MX">México</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="AR">Argentina</SelectItem>
                <SelectItem value="CL">Chile</SelectItem>
                <SelectItem value="PE">Perú</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("form.saving") : t("form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
