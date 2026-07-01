import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <View
      className="items-center justify-center px-6 py-10"
      accessibilityLabel={title}
    >
      <Icon size={48} color="hsl(240 5% 65%)" strokeWidth={1.5} />
      <Text className="text-foreground text-lg font-semibold mt-4 text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-muted-foreground text-sm mt-1 text-center">{subtitle}</Text>
      ) : null}
      {action ? (
        <Button onPress={action.onPress} className="mt-6" accessibilityLabel={action.label}>
          <Text className="text-primary-foreground font-semibold">{action.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}
