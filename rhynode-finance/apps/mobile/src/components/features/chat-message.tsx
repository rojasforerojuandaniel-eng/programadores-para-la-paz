import { useTranslation } from 'react-i18next';
import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import type { ChatMessage } from '~/hooks/use-chat';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <View
      className={`max-w-[85%] rounded-2xl p-4 mb-3 ${
        isUser ? 'bg-primary self-end rounded-br-sm' : 'bg-card self-start rounded-bl-sm'
      }`}
      accessible
      accessibilityLabel={isUser ? t('a11y.chat.userMessage') : t('a11y.chat.assistantMessage')}
    >
      <Text className={isUser ? 'text-primary-foreground' : 'text-foreground'}>
        {message.content}
      </Text>
    </View>
  );
}
