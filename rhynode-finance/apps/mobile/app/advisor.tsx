import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { Brain, Send, ChevronLeft, Sparkles } from 'lucide-react-native';
import { KeyboardAvoidingView } from '~/components/ui/keyboard-avoiding-view';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { useChat, type ChatMessage } from '~/hooks/use-chat';

const SUGGESTIONS = [
  '¿Cómo puedo reducir mis gastos este mes?',
  '¿Cuánto debo ahorrar para mi meta?',
  '¿Estoy gastando demasiado en restaurantes?',
  'Dame un resumen de mis finanzas',
];

export default function AdvisorScreen() {
  const router = useRouter();
  const { messages, sendMessage, isLoading: streaming } = useChat();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const onSend = () => {
    if (!input.trim() || streaming) return;
    sendMessage(input.trim());
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
      <View className="flex-row items-center justify-between px-6 pt-6 pb-2">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
          <ChevronLeft size={20} className="text-foreground" />
          <Text className="text-foreground text-base font-medium">Volver</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Brain size={18} color="#10b981" />
          <Text className="text-foreground text-lg font-bold">Asesor IA</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Sparkles size={32} color="#10b981" />
            </View>
            <Text className="text-foreground text-lg font-semibold mb-2">Asesor financiero IA</Text>
            <Text className="text-muted-foreground text-center text-sm mb-6">
              Pregúntame cualquier cosa sobre tus finanzas personales o de negocio.
            </Text>
            <View className="gap-2 w-full">
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => { setInput(suggestion); }}
                  className="bg-card rounded-xl p-3"
                >
                  <Text className="text-muted-foreground text-sm">{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
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
          <Pressable
            onPress={onSend}
            disabled={streaming || !input.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              streaming || !input.trim() ? 'bg-muted' : 'bg-primary'
            }`}
          >
            {streaming ? (
              <Text className="text-primary-foreground">...</Text>
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
