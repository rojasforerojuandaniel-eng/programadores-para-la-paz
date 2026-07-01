import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import type { ChatMessage } from '~/hooks/use-chat';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <View
      className={`max-w-[85%] rounded-2xl p-4 mb-3 ${
        isUser ? 'bg-primary self-end rounded-br-sm' : 'bg-card self-start rounded-bl-sm'
      }`}
      accessible
      accessibilityLabel={isUser ? 'Tu mensaje' : 'Respuesta del asesor'}
    >
      <Text className={isUser ? 'text-primary-foreground' : 'text-foreground'}>
        {message.content}
      </Text>
    </View>
  );
}
