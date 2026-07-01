import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text as RNText,
  type AccessibilityRole,
} from 'react-native';
import { ChevronDown, Tag, X } from 'lucide-react-native';
import { colors } from '~/theme/colors';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';

export const COMMON_CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Ropa',
  'Viajes',
  'Tecnología',
  'Mascotas',
  'Regalos',
  'Ingresos',
  'Otros',
];

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  recent?: string[];
}

export function CategoryPicker({ value, onChange, recent }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const titleRef = useRef<React.ElementRef<typeof RNText>>(null);

  useEffect(() => {
    if (open) {
      AccessibilityInfo.announceForAccessibility('Seleccionar categoría');
      // Move screen reader focus to the modal title on Android. iOS will rely on
      // the announcement because setAccessibilityFocus behavior differs by platform.
      const timer = setTimeout(() => {
        const focusable = titleRef.current as
          | ({ setAccessibilityFocus?: () => void })
          | null;
        focusable?.setAccessibilityFocus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMON_CATEGORIES;
    return COMMON_CATEGORIES.filter((category) =>
      category.toLowerCase().includes(normalized)
    );
  }, [query]);

  const recentCategories = useMemo(() => {
    if (!recent) return [];
    return recent.filter((category) => COMMON_CATEGORIES.includes(category));
  }, [recent]);

  const select = (category: string) => {
    onChange(category);
    setQuery('');
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.row}
        accessibilityLabel={`Categoría: ${value}`}
        accessibilityRole="button"
      >
        <Tag size={20} color="#9ca3af" strokeWidth={1.5} />
        <Text className="flex-1 text-foreground">{value}</Text>
        <ChevronDown size={20} color="#9ca3af" strokeWidth={1.5} />
      </Pressable>

      <Modal
        animationType="slide"
        visible={open}
        onRequestClose={() => setOpen(false)}
        presentationStyle="fullScreen"
        accessibilityViewIsModal
        accessibilityLiveRegion="assertive"
      >
        <View
          className="flex-1 bg-background px-4 pt-12"
          accessibilityRole={('dialog' as AccessibilityRole)}
          accessible
        >
          <View className="mb-4 flex-row items-center justify-between">
            <RNText
              ref={titleRef}
              style={styles.title}
              accessibilityRole="header"
            >
              Seleccionar categoría
            </RNText>
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.closeButton}
              accessibilityLabel="Cerrar"
            >
              <X size={24} color="#9ca3af" strokeWidth={1.5} />
            </Pressable>
          </View>

          <View className="mb-4 rounded-2xl bg-card px-3 py-2">
            <TextInput
              label="Buscar categoría"
              className="text-foreground"
              placeholder="Buscar categoría"
              placeholderTextColor="#6b7280"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          {recentCategories.length > 0 && (
            <View className="mb-4">
              <Text className="mb-2 text-sm text-muted-foreground">Recientes</Text>
              <View className="flex-row flex-wrap gap-2">
                {recentCategories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => select(category)}
                    style={[
                      styles.chip,
                      value === category && styles.chipSelected,
                    ]}
                    accessibilityLabel={category}
                    accessibilityState={{ selected: value === category }}
                  >
                    <Text
                      className={
                        value === category
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => select(item)}
                style={[
                  styles.listRow,
                  value === item && styles.listRowSelected,
                ]}
                accessibilityLabel={item}
                accessibilityState={{ selected: value === item }}
              >
                <Text
                  className={
                    value === item
                      ? 'font-semibold text-primary-foreground'
                      : 'text-foreground'
                  }
                >
                  {item}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            ListEmptyComponent={
              <Text className="py-8 text-center text-muted-foreground">
                No se encontraron categorías
              </Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0d0e13',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
  },
  chip: {
    backgroundColor: '#26272b',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  listRow: {
    backgroundColor: '#0d0e13',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listRowSelected: {
    backgroundColor: colors.primary,
  },
});
