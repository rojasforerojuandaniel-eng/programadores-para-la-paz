export type CategoryType = "INCOME" | "EXPENSE" | "TRANSFER";

export interface CategoryRow {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  parent: { name: string } | null;
  spent: number;
  earned: number;
  totalFlow: number;
}
