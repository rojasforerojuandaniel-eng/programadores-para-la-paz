import { useState } from 'react';
import { formatCurrency } from '@rhynode/shared';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '~/components/ui/card';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

interface BalanceCardProps {
  balance: number;
  currency: string;
}

export function BalanceCard({ balance, currency }: BalanceCardProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  return (
    <Card className="w-full">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-muted-foreground text-sm">{t('dashboard.balance.total')}</Text>
        <Pressable
          onPress={() => setVisible((v) => !v)}
          className="p-2 -mr-2"
          accessibilityRole="button"
          accessibilityLabel={visible ? t('dashboard.balance.hideAccessibility') : t('dashboard.balance.showAccessibility')}
        >
          {visible ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
        </Pressable>
      </View>
      <Text className="text-foreground text-3xl font-bold">
        {visible ? formatCurrency(balance, currency, 'es') : '••••••'}
      </Text>
    </Card>
  );
}
