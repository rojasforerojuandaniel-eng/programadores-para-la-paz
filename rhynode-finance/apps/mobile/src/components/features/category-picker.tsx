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
import { useTranslation } from 'react-i18next';
import { ChevronDown, Tag, X } from 'lucide-react-native';
import { colors } from '~/theme/colors';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  recent?: string[];
}

export function CategoryPicker({ value, onChange, recent }: CategoryPickerProps) {
  const { t } = useTranslation();
  const commonCategories = useMemo(
    () => [
      t('transactions.categories.food'),
      t('transactions.categories.transport'),
      t('transactions.categories.housing'),
      t('transactions.categories.utilities'),
      t('transactions.categories.entertainment'),
      t('transactions.categories.health'),
      t('transactions.categories.education'),
      t('transactions.categories.clothing'),
      t('transactions.categories.travel'),
      t('transactions.categories.technology'),
      t('transactions.categories.pets'),
      t('transactions.categories.gifts'),
      t('transactions.categories.income'),
      t('transactions.categories.other'),
    ],
    [t]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const titleRef = useRef<React.ElementRef<typeof RNText>>(null);

  useEffect(() => {
    if (open) {
      AccessibilityInfo.announceForAccessibility(t('transactions.categoryPicker.openAnnouncement'));
      const timer = setTimeout(() => {
        const focusable = titleRef.current as
          | ({ setAccessibilityFocus?: () => void })
          | null;
        focusable?.setAccessibilityFocus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, t]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commonCategories;
    return commonCategories.filter((category) =>
      category.toLowerCase().includes(normalized)
    );
  }, [query, commonCategories]);

  const recentCategories = useMemo(() => {
    if (!recent) return [];
    return recent.filter((category) => commonCategories.includes(category));
  }, [recent, commonCategories]);

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
        accessibilityLabel={t('transactions.categoryPicker.currentValue', { category: value })}
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
              {t('transactions.categoryPicker.title')}
            </RNText>
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.closeButton}
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
            >
              <X size={24} color="#9ca3af" strokeWidth={1.5} />
            </Pressable>
          </View>

          <View className="mb-4 rounded-2xl bg-card px-3 py-2">
            <TextInput
              label={t('transactions.categoryPicker.searchLabel')}
              className="text-foreground"
              placeholder={t('transactions.categoryPicker.searchPlaceholder')}
              placeholderTextColor="#6b7280"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          {recentCategories.length > 0 && (
            <View className="mb-4">
              <Text className="mb-2 text-sm text-muted-foreground">{t('transactions.categoryPicker.recent')}</Text>
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
                    accessibilityRole="button"
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
                accessibilityRole="button"
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
                {t('transactions.categoryPicker.noResults')}
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
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#26272b',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  listRow: {
    backgroundColor: '#0d0e13',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  listRowSelected: {
    backgroundColor: colors.primary,
  },
});
