import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { formatCurrency, formatDate } from '@rhynode/shared';
import { EmptyState } from '~/components/ui/empty-state';
import { Pressable } from '~/components/ui/pressable';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';

interface Invoice {
  id: string;
  number: string;
  clientName: string | null;
  total: number;
  currency: string;
  status: string;
  dueDate: string | null;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useBusinessData<{ invoices: Invoice[] }>('invoices');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
    >
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Facturas</Text>

      {isLoading && !data ? (
        <SkeletonGroup>
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </SkeletonGroup>
      ) : data?.invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay facturas aún"
          subtitle="Crea tu primera factura electrónica para empezar a facturar."
        />
      ) : (
        data?.invoices.map((invoice) => (
          <View key={invoice.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-foreground font-medium">{invoice.number}</Text>
            <Text className="text-muted-foreground text-sm">{invoice.clientName ?? 'Sin cliente'}</Text>
            <Text className="text-foreground text-lg font-bold mt-1">
              {formatCurrency(invoice.total, invoice.currency, 'es')}
            </Text>
            <Text className="text-muted-foreground text-sm capitalize">
              {invoice.status.toLowerCase()}
              {invoice.dueDate ? ` · Vence ${formatDate(invoice.dueDate, 'es')}` : ''}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
