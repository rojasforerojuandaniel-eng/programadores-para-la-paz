"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { ClientAvatar } from "./client-avatar";
import { DeleteButton } from "./delete-button";
import { EditClientDialog } from "./edit-client-dialog";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { Mail, MoreVertical, Phone, Pencil } from "lucide-react";

export interface ClientRow {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  status: string;
  invoiceCount: number;
  invoiceTotal: number;
}

interface ClientListProps {
  rows: ClientRow[];
  countryLabels: Record<string, string>;
  formatCOP: (amount: number | null | undefined) => string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-500/10 text-emerald-600" },
  INACTIVE: { label: "Inactivo", className: "bg-gray-500/10 text-gray-600" },
  ARCHIVED: { label: "Archivado", className: "bg-gray-500/10 text-gray-600" },
};

function ContactLink({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      <span className="truncate text-muted-foreground">{value}</span>
    </a>
  );
}

function MobileClientCard({
  client,
  countryLabels,
  formatCOP,
  onUpdate,
}: {
  client: ClientRow;
  countryLabels: Record<string, string>;
  formatCOP: (amount: number | null | undefined) => string;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { canEdit } = useOrganizationRole();
  const status = statusConfig[client.status] || statusConfig.ACTIVE;
  const location = [client.city, countryLabels[client.country || ""]]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="surface-elevated-2 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <ClientAvatar name={client.name} className="h-12 w-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight">{client.name}</h3>
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="block truncate text-sm text-muted-foreground hover:text-primary"
                >
                  {client.email}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">Sin email</span>
              )}
            </div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">NIT</dt>
          <dd className="truncate font-mono">{client.taxId || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Teléfono</dt>
          <dd className="truncate">
            {client.phone ? (
              <a
                href={`tel:${client.phone}`}
                className="text-primary hover:underline"
              >
                {client.phone}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-xs text-muted-foreground">Ciudad</dt>
          <dd className="truncate">{location || "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0 text-sm">
          <span className="text-muted-foreground">{client.invoiceCount} facturas · </span>
          <span className="font-semibold">{formatCOP(client.invoiceTotal)}</span>
        </div>

        <BottomSheet open={open} onOpenChange={setOpen}>
          <BottomSheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={`Acciones de ${client.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </BottomSheetTrigger>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Acciones</BottomSheetTitle>
              <BottomSheetDescription>{client.name}</BottomSheetDescription>
            </BottomSheetHeader>
            <div className="flex flex-col gap-1 py-2">
              {client.phone && (
                <ContactLink
                  href={`tel:${client.phone}`}
                  icon={Phone}
                  label="Llamar"
                  value={client.phone}
                />
              )}
              {client.email && (
                <ContactLink
                  href={`mailto:${client.email}`}
                  icon={Mail}
                  label="Enviar email"
                  value={client.email}
                />
              )}
              {canEdit && (
                <EditClientDialog client={client} onUpdate={onUpdate}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
                    onClick={() => setOpen(false)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Editar cliente
                  </button>
                </EditClientDialog>
              )}
              {canEdit && (
                <div className="px-1">
                  <DeleteButton
                    endpoint={`/api/clients/${client.id}`}
                    confirmMessage="¿Eliminar este cliente permanentemente?"
                    title="Eliminar cliente"
                  />
                </div>
              )}
            </div>
          </BottomSheetContent>
        </BottomSheet>
      </div>
    </li>
  );
}

function DesktopTable({
  rows,
  countryLabels,
  formatCOP,
  onUpdate,
}: {
  rows: ClientRow[];
  countryLabels: Record<string, string>;
  formatCOP: (amount: number | null | undefined) => string;
  onUpdate: () => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Nombre</TableHead>
            <TableHead scope="col">NIT / RFC / CNPJ</TableHead>
            <TableHead scope="col">Email</TableHead>
            <TableHead scope="col">Teléfono</TableHead>
            <TableHead scope="col">Ciudad</TableHead>
            <TableHead scope="col">Estado</TableHead>
            <TableHead scope="col" className="text-right">Facturas</TableHead>
            <TableHead scope="col" className="text-right">Total facturado</TableHead>
            <TableHead scope="col" className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((client) => {
            const status = statusConfig[client.status] || statusConfig.ACTIVE;
            return (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <ClientAvatar name={client.name} className="h-9 w-9 text-sm" />
                    <span className="min-w-0 truncate">{client.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{client.taxId || "—"}</TableCell>
                <TableCell className="text-sm">
                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                      className="text-primary hover:underline"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {[client.city, countryLabels[client.country || ""]]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {client.invoiceCount}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCOP(client.invoiceTotal)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditClientDialog client={client} onUpdate={onUpdate} />
                    <DeleteButton
                      endpoint={`/api/clients/${client.id}`}
                      confirmMessage="¿Eliminar este cliente permanentemente?"
                      title="Eliminar cliente"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientList({ rows, countryLabels, formatCOP }: ClientListProps) {
  const router = useRouter();
  const onUpdate = () => router.refresh();

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:hidden" role="list" aria-label="Lista de clientes">
        {rows.map((client) => (
          <MobileClientCard
            key={client.id}
            client={client}
            countryLabels={countryLabels}
            formatCOP={formatCOP}
            onUpdate={onUpdate}
          />
        ))}
      </ul>
      <DesktopTable
        rows={rows}
        countryLabels={countryLabels}
        formatCOP={formatCOP}
        onUpdate={onUpdate}
      />
    </>
  );
}
