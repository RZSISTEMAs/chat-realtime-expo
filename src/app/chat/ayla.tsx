import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Platform,
  ActivityIndicator, Dimensions, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Calendar from 'expo-calendar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'ayla';
  text: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  WAITLISTED: '@ayla_waitlisted',
  RANK: '@ayla_waitlist_rank',
};

// Data alvo: 08 de Agosto de 2026
const TARGET_DATE = new Date(2026, 7, 8, 0, 0, 0); 
const REMINDER_DATE = new Date(2026, 6, 29, 10, 0, 0); // 10 dias antes (29 de Julho)

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
    </View>
  );
}

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

// Componente de Contagem Regressiva
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = TARGET_DATE.getTime() - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const Digit = ({ val, label }: { val: number, label: string }) => (
    <View style={styles.countdownDigitBox}>
      <Text style={styles.countdownVal}>{val.toString().padStart(2, '0')}</Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.countdownContainer}>
      <Digit val={timeLeft.days} label="DIAS" />
      <Text style={styles.countdownSep}>:</Text>
      <Digit val={timeLeft.hours} label="HORAS" />
      <Text style={styles.countdownSep}>:</Text>
      <Digit val={timeLeft.minutes} label="MIN" />
      <Text style={styles.countdownSep}>:</Text>
      <Digit val={timeLeft.seconds} label="SEG" />
    </View>
  );
}

export default function AylaChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadWaitlistData();
    startDemo();
  }, []);

  const loadWaitlistData = async () => {
    try {
      const waitlisted = await AsyncStorage.getItem(STORAGE_KEYS.WAITLISTED);
      const rank = await AsyncStorage.getItem(STORAGE_KEYS.RANK);
      if (waitlisted === 'true') {
        setIsWaitlisted(true);
        if (rank) setUserRank(parseInt(rank));
      }
    } catch (e) {}
  };

  const startDemo = async () => {
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'ayla',
      text: 'Oi! Eu sou a Ayla. ✨\nNeste momento estou descansando para uma atualização épica, mas veja o que eu já sei fazer!',
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const demoUserMsg: Message = {
          id: 'demo-1',
          role: 'user',
          text: 'Ayla, você pode me ajudar a planejar minha viagem de férias?',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, demoUserMsg]);

        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            const demoAylaMsg: Message = {
              id: 'demo-2',
              role: 'ayla',
              text: 'Com certeza! 🌍 Posso criar roteiros personalizados, dar dicas de hotéis e até traduzir frases úteis para você não passar sufoco. Mal posso esperar para ser sua companheira de viagem!',
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, demoAylaMsg]);
            
            setTimeout(() => setShowPaywall(true), 1500);
          }, 2500);
        }, 1500);
      }, 2000);
    }, 2000);
  };

  const handleJoinWaitlist = async () => {
    const randomRank = Math.floor(Math.random() * (30000 - 12000 + 1)) + 12000;
    await AsyncStorage.setItem(STORAGE_KEYS.WAITLISTED, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.RANK, randomRank.toString());
    setIsWaitlisted(true);
    setUserRank(randomRank);
  };

  const handleCreateReminder = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];

        if (defaultCalendar) {
          await Calendar.createEventAsync(defaultCalendar.id, {
            title: '🎁 Ayla IA: 10 Dias para a Grande Abertura!',
            startDate: REMINDER_DATE,
            endDate: new Date(REMINDER_DATE.getTime() + 60 * 60 * 1000), // 1h de duração
            timeZone: 'GMT-3',
            notes: 'A Ayla IA terá 10 mil novas vagas abertas em breve! Fique atento(a).',
            location: 'NextGen Messaging App',
          });
          Alert.alert("Sucesso! 🎉", "Lembrete adicionado ao seu calendário para o dia 29 de Julho.");
        }
      } catch (e) {
        Alert.alert("Erro", "Não foi possível acessar o seu calendário.");
      }
    } else {
      Alert.alert("Permissão negada", "Precisamos de acesso ao calendário para criar o lembrete.");
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        {!isUser && <AylaAvatar size={30} style={styles.inlineavatar} />}
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
          {[0, 1, 2].map(i => <TypingDot key={i} delay={i * 200} />)}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />

      <View style={styles.header}>
        {Platform.OS === 'ios' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <AylaAvatar size={38} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerName}>Ayla IA</Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerStatus}>Membro de Elite</Text>
            </View>
          </View>
        </View>

        <View style={styles.premiumBadge}><Ionicons name="diamond" size={16} color="#FFE066" /></View>
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />

          {showPaywall && (
            <View style={styles.paywallOverlay}>
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(10, 10, 30, 0.95)', '#050510']} style={StyleSheet.absoluteFill} />
              
              <View style={styles.paywallContent}>
                <CountdownTimer />

                <Text style={styles.paywallTitle}>{isWaitlisted ? "Lista de Espera" : "Ayla Premium ✨"}</Text>
                
                <Text style={styles.paywallSub}>
                  {isWaitlisted 
                    ? `Você está na posição #${userRank?.toLocaleString('pt-BR')} na fila. Em agosto teremos novidades!`
                    : "Em 08 de agosto, 10.000 novas vagas serão abertas para o acesso ilimitado à Ayla."}
                </Text>

                <View style={styles.actionRow}>
                   {!isWaitlisted ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinWaitlist} activeOpacity={0.8}>
                      <LinearGradient colors={['#a855f7', '#6366f1']} style={styles.primaryGrad}>
                        <Text style={styles.btnText}>Lista de Espera</Text>
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={() => {
                        Alert.alert("Vagas Esgotadas", "Lamentamos, mas no momento as vagas estão fechadas.\n\nPróxima abertura: 08 de Agosto.");
                    }}>
                      <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.primaryGrad}>
                        <Text style={[styles.btnText, { color: '#000' }]}>Fila Premium 🚀</Text>
                        <Ionicons name="flash" size={18} color="#000" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleCreateReminder}>
                    <Ionicons name="calendar-outline" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Lembrar-me</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoCapsule}>
                  <Text style={styles.infoText}>+ 10.000 Vagas • Agosto 08 • Insígnia Especial</Text>
                </View>
              </View>
            </View>
          )}

          {!showPaywall && (
            <View style={styles.inputArea}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 30, 0.96)' }]} />
              <View style={styles.inputPlaceholder}>
                <Text style={styles.inputPlaceholderText}>Aguardando demonstração...</Text>
                <ActivityIndicator size="small" color="#a855f7" />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(600),
    ])).start();
  }, []);
  return <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  auroraContainer: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
  blob: { position: 'absolute', borderRadius: 300, opacity: 0.18 },
  blob1: { width: 350, height: 350, backgroundColor: '#a855f7', top: -100, left: -80 },
  blob2: { width: 300, height: 300, backgroundColor: '#6366f1', bottom: -50, right: -80 },
  blob3: { width: 200, height: 200, backgroundColor: '#00D084', top: '40%', right: -60, opacity: 0.1 },
  header: { height: 100, width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 40, backgroundColor: 'rgba(26, 28, 41, 0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(168, 85, 247, 0.15)', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerTitles: { justifyContent: 'center' },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#a855f7' },
  headerStatus: { fontSize: 11, color: '#a855f7', fontWeight: '600' },
  premiumBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 224, 102, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 224, 102, 0.3)' },
  listContainer: { padding: 15, paddingBottom: 20, paddingTop: 10 },
  bubbleWrapper: { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
  bubbleWrapperLeft: { justifyContent: 'flex-start' },
  bubbleWrapperRight: { justifyContent: 'flex-end' },
  inlineavatar: { marginRight: 8, marginBottom: 4 },
  bubble: { padding: 14, borderRadius: 22, maxWidth: '80%' },
  aylaBubble: { backgroundColor: 'rgba(168, 85, 247, 0.12)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)', borderBottomLeftRadius: 6 },
  myBubble: { backgroundColor: 'rgba(99, 102, 241, 0.85)', borderBottomRightRadius: 6 },
  typingBubble: { paddingVertical: 10 },
  aylaName: { color: '#a855f7', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  msgText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 22, fontWeight: '400' },
  msgTextUser: { color: '#FFF', fontWeight: '500' },
  timeText: { color: 'rgba(168, 85, 247, 0.5)', fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
  timeTextUser: { color: 'rgba(255,255,255,0.4)' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#a855f7' },
  inputArea: { padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(168, 85, 247, 0.1)' },
  inputPlaceholder: { flexDirection: 'row', backgroundColor: 'rgba(168, 85, 247, 0.08)', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.15)' },
  inputPlaceholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500' },
  paywallOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  paywallContent: { padding: 25, paddingBottom: 50, alignItems: 'center' },
  paywallTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8, marginTop: 15 },
  paywallSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 25, paddingHorizontal: 20 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  primaryBtn: { flex: 2, height: 55, borderRadius: 28, overflow: 'hidden' },
  primaryGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  secondaryBtn: { flex: 1, height: 55, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  infoCapsule: { backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  infoText: { color: '#a855f7', fontSize: 11, fontWeight: '700' },
  
  // Countdown Styles
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countdownDigitBox: { backgroundColor: 'rgba(255,255,255,0.05)', width: 55, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  countdownVal: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  countdownLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '700', marginTop: 2 },
  countdownSep: { color: '#a855f7', fontSize: 20, fontWeight: '900', paddingBottom: 15 },
});
