import { z, type ZodType } from 'zod';

export const clientSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.string().optional(),
  scope: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Client = z.infer<typeof clientSchema>;

export const projectSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  budget: z.coerce.number().nullable().optional(),
  color: z.string().nullable().optional(),
  currency: z.string().default('COP'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const invoiceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  clientId: z.string(),
  projectId: z.string().nullable().optional(),
  number: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotal: z.coerce.number(),
  taxRate: z.coerce.number(),
  taxAmount: z.coerce.number(),
  total: z.coerce.number(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  clientName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const businessAccountSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.coerce.number(),
  currency: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type BusinessAccount = z.infer<typeof businessAccountSchema>;

export const clientsResponseSchema = z.object({ clients: z.array(clientSchema) });
export type ClientsResponse = z.infer<typeof clientsResponseSchema>;

export const projectsResponseSchema = z.object({ projects: z.array(projectSchema) });
export type ProjectsResponse = z.infer<typeof projectsResponseSchema>;

export const invoicesResponseSchema = z.object({ invoices: z.array(invoiceSchema) });
export type InvoicesResponse = z.infer<typeof invoicesResponseSchema>;

export const businessAccountsResponseSchema = z.object({ accounts: z.array(businessAccountSchema) });
export type BusinessAccountsResponse = z.infer<typeof businessAccountsResponseSchema>;

export type BusinessDataResponseMap = {
  clients: ClientsResponse;
  projects: ProjectsResponse;
  invoices: InvoicesResponse;
  accounts: BusinessAccountsResponse;
};

export type BusinessDataType = keyof BusinessDataResponseMap;

export const businessDataSchemaMap: {
  [K in BusinessDataType]: ZodType<BusinessDataResponseMap[K]>;
} = {
  clients: clientsResponseSchema,
  projects: projectsResponseSchema,
  invoices: invoicesResponseSchema,
  accounts: businessAccountsResponseSchema,
};
