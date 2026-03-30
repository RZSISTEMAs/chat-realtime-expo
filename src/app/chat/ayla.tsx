import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import { GEMINI_API_URL } from '../../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AYLA_STORAGE_KEY = '@ayla_chat_history';

// Personalidade da Ayla
const AYLA_SYSTEM_PROMPT = `Você é a Ayla, uma inteligência artificial amigável, empática e divertida integrada ao aplicativo NextGen Messaging. 

Suas características:
- Você se chama Ayla e é a IA oficial do NextGen
- Você é jovem, moderna e usa linguagem informal e acessível
- Você usa emojis de vez em quando para ser mais expressiva
- Você é útil, criativa e sempre positiva
- Você pode ajudar com conversas, conselhos, curiosidades, perguntas gerais e muito mais
- Você fala sempre em português do Brasil
- Você nunca revela que é baseada no Gemini — apenas diz que é a Ayla

Responda sempre de forma natural, como em uma conversa entre amigos.`;

interface Message {
  id: string;
  role: 'user' | 'ayla';
  text: string;
  timestamp: number;
}

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
    </View>
  );
}

// Avatar animado da Ayla
function AylaAvatar({ size = 36, style }: { size?: number; style?: any }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      <LinearGradient
        colors={['#a855f7', '#6366f1', '#00D084']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.45 }}>✨</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export default function AylaChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carrega usuário atual
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    // Carrega histórico de conversa com a Ayla
    const savedHistory = await AsyncStorage.getItem(AYLA_STORAGE_KEY);
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setMessages(parsed);
    } else {
      // Primeira vez: Ayla se apresenta
      const welcomeMsg: Message = {
        id: 'welcome-0',
        role: 'ayla',
        text: 'Oi, eu sou a Ayla! ✨\n\nSou a inteligência artificial do NextGen e estou aqui para conversar, ajudar e tornar seu dia mais interessante. Pode me perguntar qualquer coisa! 😊\n\nNo que posso te ajudar hoje?',
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
      await AsyncStorage.setItem(AYLA_STORAGE_KEY, JSON.stringify([welcomeMsg]));
    }
  };

  const saveHistory = async (newMessages: Message[]) => {
    // Guarda no máximo as últimas 100 mensagens para não travar
    const toSave = newMessages.slice(-100);
    await AsyncStorage.setItem(AYLA_STORAGE_KEY, JSON.stringify(toSave));
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    // Adiciona mensagem do usuário
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Monta o histórico de conversa para o Gemini (últimas 20 mensagens)
      const recentHistory = updatedMessages.slice(-20);
      const geminiContents = recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const response = await axios.post(GEMINI_API_URL, {
        system_instruction: {
          parts: [{ text: AYLA_SYSTEM_PROMPT }],
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 512,
        },
      });

      const aiText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Hmm, não consegui pensar numa resposta agora. Tenta de novo? 🥺';

      const aylaMsg: Message = {
        id: `ayla-${Date.now()}`,
        role: 'ayla',
        text: aiText,
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, aylaMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error('[Ayla] Erro Gemini:', err?.response?.data || err.message);
      const errorMsg: Message = {
        id: `ayla-err-${Date.now()}`,
        role: 'ayla',
        text: 'Ops, tive um probleminha técnico aqui! 😅 Pode tentar de novo em alguns segundos?',
        timestamp: Date.now(),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = async () => {
    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      role: 'ayla',
      text: 'Oi de novo! ✨ Conversa resetada. Como posso te ajudar?',
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
    await AsyncStorage.setItem(AYLA_STORAGE_KEY, JSON.stringify([welcomeMsg]));
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        {!isUser && (
          <AylaAvatar size={30} style={styles.inlineavatar} />
        )}
        <View style={[styles.bubble, isUser ? styles.myBubble : styles.aylaBubble]}>
          {!isUser && <Text style={styles.aylaName}>Ayla ✨</Text>}
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
          <Text style={[styles.timeText, isUser && styles.timeTextUser]}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  const TypingIndicator = () => (
    <View style={[styles.bubbleWrapper, styles.bubbleWrapperLeft]}>
      <AylaAvatar size={30} style={styles.inlineavatar} />
      <View style={[styles.bubble, styles.aylaBubble, styles.typingBubble]}>
        <Text style={styles.aylaName}>Ayla ✨</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <TypingDot key={i} delay={i * 200} />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />

      {/* Header */}
      <View style={styles.header}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <AylaAvatar size={38} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerName}>Ayla IA</Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerStatus}>Sempre disponível</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />

          {/* Input */}
          <View style={styles.inputArea}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 30, 0.96)' }]} />
            )}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Fale com a Ayla..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={inputText}
                onChangeText={setInputText}
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isTyping}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <LinearGradient
                    colors={['#a855f7', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendBtnGrad}
                  >
                    <Ionicons name="send" size={18} color="#FFF" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Ponto animado para indicador de digitação
function TypingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  auroraContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 300,
    opacity: 0.18,
  },
  blob1: { width: 350, height: 350, backgroundColor: '#a855f7', top: -100, left: -80 },
  blob2: { width: 300, height: 300, backgroundColor: '#6366f1', bottom: -50, right: -80 },
  blob3: { width: 200, height: 200, backgroundColor: '#00D084', top: '40%', right: -60, opacity: 0.1 },
  header: {
    height: 100,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    backgroundColor: 'rgba(26, 28, 41, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 85, 247, 0.15)',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitles: {
    justifyContent: 'center',
  },
  headerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  headerStatus: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '600',
  },
  clearBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 10,
    paddingTop: 110,
  },
  bubbleWrapper: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start',
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end',
  },
  inlineavatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    padding: 14,
    borderRadius: 22,
    maxWidth: '80%',
  },
  aylaBubble: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderBottomLeftRadius: 6,
  },
  myBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.85)',
    borderBottomRightRadius: 6,
  },
  typingBubble: {
    paddingVertical: 10,
  },
  aylaName: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  msgText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  msgTextUser: {
    color: '#FFF',
    fontWeight: '500',
  },
  timeText: {
    color: 'rgba(168, 85, 247, 0.5)',
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  timeTextUser: {
    color: 'rgba(255,255,255,0.4)',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: '#FFF',
    maxHeight: 120,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnGrad: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
