import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Check, Calendar } from 'lucide-react-native';
import { useCreateTransaction } from '~/hooks/use-transactions';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';

const EXPENSE_CATEGORIES = [
  'Mercado', 'Restaurante', 'Transporte', 'Telecomunicaciones',
  'Servicios públicos', 'Seguros', 'Salud', 'Educación',
  'Entretenimiento', 'Ropa', 'Viajes', 'Compras', 'Otros',
];

const INCOME_CATEGORIES = [
  'Ventas', 'Nómina', 'Servicios', 'Transferencia/Finanzas', 'Otros',
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const createTransaction = useCreateTransaction();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

  const handleSubmit = () => {
    if (parsedAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Ingresa una descripción');
      return;
    }

    createTransaction.mutate(
      {
        type,
        amount: parsedAmount,
        description: description.trim(),
        category: category || null,
        currency: 'COP',
        date,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo guardar la transacción');
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
          <ChevronLeft size={20} className="text-foreground" />
          <Text className="text-foreground text-base font-medium">Volver</Text>
        </Pressable>
        <Text className="text-foreground text-lg font-bold">Nueva transacción</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Type Toggle */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => { setType('EXPENSE'); setCategory(''); }}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl ${
              type === 'EXPENSE' ? 'bg-destructive' : 'bg-card'
            }`}
          >
            <ArrowUpRight size={20} color={type === 'EXPENSE' ? '#ffffff' : '#ef4444'} />
            <Text className={`ml-2 font-semibold ${type === 'EXPENSE' ? 'text-white' : 'text-foreground'}`}>
              Gasto
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setType('INCOME'); setCategory(''); }}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl ${
              type === 'INCOME' ? 'bg-success' : 'bg-card'
            }`}
          >
            <ArrowDownLeft size={20} color={type === 'INCOME' ? '#ffffff' : '#10b981'} />
            <Text className={`ml-2 font-semibold ${type === 'INCOME' ? 'text-white' : 'text-foreground'}`}>
              Ingreso
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <View className="mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-2">Monto</Text>
          <View className="bg-card rounded-2xl px-5 py-4 flex-row items-center">
            <Text className="text-foreground text-4xl font-bold">
              {amount ? `$${Number(amount.replace(/[^0-9.]/g, '')).toLocaleString('es-CO')}` : '$0'}
            </Text>
          </View>
          {/* Quick amount buttons */}
          <View className="flex-row gap-2 mt-3">
            {[10000, 25000, 50000, 100000].map((val) => (
              <Pressable
                key={val}
                onPress={() => setAmount(String(val))}
                className="flex-1 bg-card rounded-xl py-2 items-center"
              >
                <Text className="text-muted-foreground text-xs">
                  ${(val / 1000).toFixed(0)}K
                </Text>
              </Pressable>
            ))}
          </View>
          {/* Manual amount input */}
          <View className="bg-card rounded-2xl px-4 py-3 mt-3 flex-row items-center">
            <Text className="text-muted-foreground mr-2">$</Text>
            <TextInput
              className="flex-1 text-foreground text-lg"
              placeholder="Escribe el monto..."
              placeholderTextColor="#6b7280"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-2">Descripción</Text>
          <View className="bg-card rounded-2xl px-4 py-3">
            <TextInput
              className="text-foreground text-base"
              placeholder="¿En qué fue el gasto?"
              placeholderTextColor="#6b7280"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Date */}
        <View className="mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-2">Fecha</Text>
          <View className="bg-card rounded-2xl px-4 py-3 flex-row items-center">
            <Calendar size={18} className="text-muted-foreground mr-3" />
            <TextInput
              className="flex-1 text-foreground text-base"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6b7280"
              value={date}
              onChangeText={setDate}
            />
          </View>
        </View>

        {/* Category */}
        <View className="mb-8">
          <Text className="text-muted-foreground text-sm font-medium mb-3">Categoría</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(category === cat ? '' : cat)}
                className={`flex-row items-center px-4 py-2 rounded-full ${
                  category === cat ? 'bg-primary' : 'bg-card'
                }`}
              >
                {category === cat && <Check size={14} color="#ffffff" className="mr-1" />}
                <Text className={`text-sm ${category === cat ? 'text-white font-medium' : 'text-foreground'}`}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={createTransaction.isPending}
          className={`rounded-2xl py-4 items-center ${
            createTransaction.isPending ? 'bg-primary/50' : 'bg-primary'
          }`}
        >
          <Text className="text-white text-base font-bold">
            {createTransaction.isPending ? 'Guardando...' : 'Guardar transacción'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
