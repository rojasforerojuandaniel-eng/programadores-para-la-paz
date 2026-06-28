import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { Button } from '~/components/ui/button';
import { KeyboardAvoidingView } from '~/components/ui/keyboard-avoiding-view';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { useChat, type ChatMessage } from '~/hooks/use-chat';

export default function AdvisorScreen() {
  const router = useRouter();
  const { messages, send, streaming } = useChat();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const onSend = () => {
    if (!input.trim() || streaming) return;
    send(input.trim());
    setInput('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      className={`max-w-[85%] rounded-2xl p-4 mb-3 ${
        item.role === 'user' ? 'bg-primary self-end rounded-br-sm' : 'bg-card self-start rounded-bl-sm'
      }`}
    >
      <Text className={item.role === 'user' ? 'text-primary-foreground' : 'text-foreground'}>{item.content}</Text>
    </View>
  );

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
        ListEmptyComponent={
          <Text className="text-muted-foreground text-center mt-8">
            Escribe una pregunta sobre tus finanzas.
          </Text>
        }
      />

      <View className="px-6 py-4">
        <View className="flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-card text-foreground rounded-2xl px-4 py-3"
            placeholder="Pregunta algo..."
            placeholderTextColor="#6b7280"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Button onPress={onSend} disabled={streaming || !input.trim()} className="h-12 w-12 p-0">
            <Text className="text-primary-foreground">↑</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
