import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { hapticImpact } from '~/lib/haptics';
import { useCreateTransaction } from '~/hooks/use-transactions';

interface QuickAddFormProps {
  initialMerchant?: string;
  initialTotal?: string;
  initialDate?: string;
}

function initialDateString(date?: string) {
  if (!date) return new Date().toISOString();
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function QuickAddForm({ initialMerchant, initialTotal, initialDate }: QuickAddFormProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [description, setDescription] = useState(initialMerchant ?? '');
  const [amount, setAmount] = useState(initialTotal ?? '');
  const [category, setCategory] = useState('Otros');
  const [date] = useState(initialDateString(initialDate));
  const { mutate, isPending } = useCreateTransaction();

  const selectType = (next: 'INCOME' | 'EXPENSE') => {
    setType(next);
    void hapticImpact();
  };

  const onSubmit = () => {
    const value = parseFloat(amount);
    if (!description || Number.isNaN(value) || value <= 0) return;

    mutate(
      {
        type,
        description,
        amount: value,
        currency: 'COP',
        date,
        category,
      },
      {
        onSuccess: () => {
          setDescription('');
          setAmount('');
        },
      }
    );
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-4">
        <Button
          onPress={() => selectType('INCOME')}
          className={`flex-1 ${type === 'INCOME' ? 'bg-success' : 'bg-card'}`}
        >
          <Text className={type === 'INCOME' ? 'text-success-foreground font-semibold' : 'text-foreground'}>Recibí</Text>
        </Button>
        <Button
          onPress={() => selectType('EXPENSE')}
          className={`flex-1 ${type === 'EXPENSE' ? 'bg-destructive' : 'bg-card'}`}
        >
          <Text className={type === 'EXPENSE' ? 'text-destructive-foreground font-semibold' : 'text-foreground'}>Gasté</Text>
        </Button>
      </View>

      <TextInput
        className="bg-card text-foreground rounded-2xl px-4 py-4"
        placeholder="Descripción"
        placeholderTextColor="#6b7280"
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        className="bg-card text-foreground rounded-2xl px-4 py-4"
        placeholder="Monto"
        placeholderTextColor="#6b7280"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <TextInput
        className="bg-card text-foreground rounded-2xl px-4 py-4"
        placeholder="Categoría"
        placeholderTextColor="#6b7280"
        value={category}
        onChangeText={setCategory}
      />

      <Button onPress={onSubmit} disabled={isPending || !description || !amount}>
        <Text className="text-primary-foreground font-semibold">{isPending ? 'Guardando...' : 'Guardar'}</Text>
      </Button>
    </View>
  );
}
