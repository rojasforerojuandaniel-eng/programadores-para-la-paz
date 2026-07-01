import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { hapticNotification } from '~/lib/haptics';
import {
  transactionDetailSchema,
  transactionMutationResponseSchema,
  deleteTransactionResponseSchema,
  type TransactionDetail,
  type UpdateTransactionBody,
} from '~/schemas/transaction';

export function useTransaction(id: string | undefined) {
  const api = useApi();

  return useQuery<TransactionDetail>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.get(`/api/personal/transactions/${id}`, transactionMutationResponseSchema);
      return transactionDetailSchema.parse(response.transaction);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeleteTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      api.delete(`/api/personal/transactions/${transactionId}`, deleteTransactionResponseSchema),
    onSuccess: (_, transactionId) => {
      void hapticNotification();
      void queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, body }: { transactionId: string; body: UpdateTransactionBody }) =>
      api.patch(`/api/personal/transactions/${transactionId}`, body, transactionMutationResponseSchema),
    onSuccess: (response, { transactionId }) => {
      void hapticNotification();
      const transaction = transactionDetailSchema.parse(response.transaction);
      queryClient.setQueryData(['transaction', transactionId], transaction);
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
