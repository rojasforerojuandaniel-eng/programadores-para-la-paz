import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useApi } from './use-api';
import { hapticNotification } from '~/lib/haptics';
import {
  transactionSchema,
  transactionsResponseSchema,
  transactionMutationResponseSchema,
  createTransactionBodySchema,
  type Transaction,
  type CreateTransactionBody,
} from '~/schemas/transaction';

export type { Transaction };

interface TransactionsPage {
  transactions: Transaction[];
  nextCursor: string | null;
}

function normalizePage(page: ReturnType<typeof transactionsResponseSchema.parse>): TransactionsPage {
  return {
    transactions: page.transactions,
    nextCursor: page.nextCursor ?? null,
  };
}

export function useTransactions() {
  const api = useApi();

  const query = useInfiniteQuery<
    TransactionsPage,
    Error,
    InfiniteData<TransactionsPage, string | null>,
    readonly unknown[],
    string | null
  >({
    queryKey: ['transactions', 'personal'],
    queryFn: async ({ pageParam }) => {
      const cursorQuery =
        pageParam !== null && pageParam.length > 0
          ? `?cursor=${encodeURIComponent(pageParam)}`
          : '';
      const response = await api.get(`/api/personal/transactions${cursorQuery}`, transactionsResponseSchema);
      return normalizePage(response);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const transactions = query.data?.pages.flatMap((page) => page.transactions) ?? [];
  const hasMore = query.hasNextPage ?? false;

  return {
    ...query,
    transactions,
    hasMore,
    loadMore: query.fetchNextPage,
  };
}

export function useCreateTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateTransactionBody) =>
      api.post('/api/personal/transactions', createTransactionBodySchema.parse(body), transactionMutationResponseSchema),
    onSuccess: () => {
      void hapticNotification();
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
