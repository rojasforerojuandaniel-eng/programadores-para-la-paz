import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { Button } from '~/components/ui/button';
import { ChatMessageItem } from '~/components/features/chat-message';
import { KeyboardAvoidingView } from '~/components/ui/keyboard-avoiding-view';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { useChat, type ChatMessage } from '~/hooks/use-chat';

function TypingIndicator() {
  return (
    <View className="bg-card self-start rounded-2xl rounded-bl-sm px-4 py-3 mb-3">
      <Text className="text-muted-foreground text-sm">El asesor está escribiendo…</Text>
    </View>
  );
}

export default function AdvisorScreen() {
  const router = useRouter();
  const { messages, send, cancel, streaming, error } = useChat();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const onSend = () => {
    if (!input.trim() || streaming) return;
    send(input.trim());
    setInput('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => <ChatMessageItem message={item} />;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="px-6 pt-6 pb-2">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-primary">← Volver</Text>
        </Pressable>
        <Text className="text-foreground text-2xl font-bold">Asesor IA</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={streaming ? <TypingIndicator /> : null}
        ListEmptyComponent={
          <Text className="text-muted-foreground text-center mt-8">
            Escribe una pregunta sobre tus finanzas.
          </Text>
        }
      />

      <View className="px-6 py-4">
        {error && (
          <View className="bg-destructive/10 rounded-2xl px-4 py-3 mb-3">
            <Text className="text-destructive text-sm">{error.message}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <TextInput
            label="Pregunta al asesor"
            className="flex-1 bg-card text-foreground rounded-2xl px-4 py-3"
            placeholder="Pregunta algo…"
            placeholderTextColor="#6b7280"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!streaming}
          />
          <Button
            onPress={streaming ? cancel : onSend}
            disabled={!streaming && !input.trim()}
            className="h-12 w-12 p-0"
            variant={streaming ? 'destructive' : 'default'}
          >
            <Text className={streaming ? 'text-destructive-foreground' : 'text-primary-foreground'}>
              {streaming ? '✕' : '↑'}
            </Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
