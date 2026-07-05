export interface Client {
  id?: string;
  name?: string;
  email?: string | null;
  address?: string | null;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount?: number;
  total?: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  client?: Client;
  project?: { name?: string };
}

export interface InvoiceWithItems extends Invoice {
  clientId?: string;
  items?: InvoiceItem[];
}

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category?: string;
  description: string;
  amount: number;
  currency: string;
  isRecurring: boolean;
  bankAccountName?: string;
  bankAccountId?: string;
}
