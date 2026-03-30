import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, Animated, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHOICES = [
  { id: 'rock', emoji: '🪨', label: 'Pedra', icon: 'square-outline' },
  { id: 'paper', emoji: '📄', label: 'Papel', icon: 'document-text-outline' },
  { id: 'scissors', emoji: '✂️', label: 'Tesoura', icon: 'cut-outline' },
];

export default function JokenpoScreen() {
  const router = useRouter();
  const [userChoice, setUserChoice] = useState<any>(null);
  const [aylaChoice, setAylaChoice] = useState<any>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFighting, setIsFighting] = useState(false);
  const [score, setScore] = useState({ user: 0, ayla: 0 });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const startFight = (choice: any) => {
    setUserChoice(choice);
    setIsFighting(true);
    setResult(null);
    setAylaChoice(null);

    // Animação de "Hand Shake"
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      const ayla = CHOICES[Math.floor(Math.random() * 3)];
      setAylaChoice(ayla);
      determineWinner(choice, ayla);
      setIsFighting(false);
    }, 1200);
  };

  const determineWinner = (user: any, ayla: any) => {
    if (user.id === ayla.id) {
      setResult('DRAW');
    } else if (
      (user.id === 'rock' && ayla.id === 'scissors') ||
      (user.id === 'paper' && ayla.id === 'rock') ||
      (user.id === 'scissors' && ayla.id === 'paper')
    ) {
      setResult('WIN');
      setScore(s => ({ ...s, user: s.user + 1 }));
      if (score.user + 1 === 3) handleFinalWin();
    } else {
      setResult('LOSE');
      setScore(s => ({ ...s, ayla: s.ayla + 1 }));
    }
  };

  const handleFinalWin = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const points = 5;
        await axios.post(`${API_BASE}/games/add-points`, { userId: user.id, points });
        user.game_points = (user.game_points || 0) + points;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err) {}
  };

  const resetMatch = () => {
    setScore({ user: 0, ayla: 0 });
    setUserChoice(null);
    setAylaChoice(null);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050510', '#1a1c29']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jokenpô Royale</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scoreBoard}>
          <View style={styles.playerScore}>
              <Text style={styles.scoreName}>VOCÊ</Text>
              <Text style={styles.scoreVal}>{score.user}</Text>
          </View>
          <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
          <View style={styles.playerScore}>
              <Text style={styles.scoreName}>AYLA</Text>
              <Text style={styles.scoreVal}>{score.ayla}</Text>
          </View>
      </View>

      <View style={styles.battleArena}>
          <Animated.View style={[styles.battleHand, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={styles.handEmoji}>{isFighting ? '👊' : (userChoice?.emoji || '❔')}</Text>
              <Text style={styles.handLabel}>Sua Jogada</Text>
          </Animated.View>

          <View style={styles.resultTagArea}>
              {result && (
                  <View style={[styles.resultTag, result === 'WIN' ? styles.winTag : (result === 'LOSE' ? styles.loseTag : styles.drawTag)]}>
                      <Text style={styles.resultTagText}>
                          {result === 'WIN' ? 'VITÓRIA! ✨' : (result === 'LOSE' ? 'DERROTA 😢' : 'EMPATE 🤝')}
                      </Text>
                  </View>
              )}
          </View>

          <Animated.View style={[styles.battleHand, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={[styles.handEmoji, { transform: [{ scaleX: -1 }] }]}>{isFighting ? '👊' : (aylaChoice?.emoji || '❔')}</Text>
              <Text style={styles.handLabel}>Ayla IA</Text>
          </Animated.View>
      </View>

      <View style={styles.controls}>
          <Text style={styles.controlTitle}>{isFighting ? 'Esperando Ayla...' : 'Escolha sua jogada'}</Text>
          <View style={styles.choicesRow}>
              {CHOICES.map(choice => (
                  <TouchableOpacity 
                    key={choice.id} 
                    style={[styles.choiceBtn, userChoice?.id === choice.id && styles.activeChoice]} 
                    onPress={() => startFight(choice)}
                    disabled={isFighting || score.user === 3 || score.ayla === 3}
                  >
                      <Text style={styles.choiceEmoji}>{choice.emoji}</Text>
                      <Text style={styles.choiceLabel}>{choice.label}</Text>
                  </TouchableOpacity>
              ))}
          </View>
      </View>

      {(score.user === 3 || score.ayla === 3) && (
          <View style={styles.gameOverOverlay}>
              <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.gameOverContent}>
                  <Ionicons name={score.user === 3 ? "trophy" : "sad"} size={80} color={score.user === 3 ? "#FFD700" : "#73788B"} />
                  <Text style={styles.gameOverTitle}>{score.user === 3 ? 'Você Venceu!' : 'Ayla Venceu!'}</Text>
                  <Text style={styles.gameOverSub}>O duelo terminou em {score.user} x {score.ayla}.</Text>
                  {score.user === 3 && <Text style={styles.bonusText}>+5 pontos ganhos! 💎</Text>}
                  
                  <TouchableOpacity style={styles.restartBtn} onPress={resetMatch}>
                      <Text style={styles.restartText}>Duelo Revanche</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
                      <Text style={styles.exitText}>Sair</Text>
                  </TouchableOpacity>
              </View>
          </View>
      )}

      <View style={styles.footerInfo}>
          <Text style={styles.footerText}>Primeiro a marcar 3 pontos vence o duelo!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  scoreBoard: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'center', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  playerScore: { alignItems: 'center' },
  scoreName: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', marginBottom: 5 },
  scoreVal: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  vsBadge: { backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  vsText: { color: '#000', fontSize: 10, fontWeight: '900' },
  battleArena: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20 },
  battleHand: { alignItems: 'center', gap: 10 },
  handEmoji: { fontSize: 80 },
  handLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  resultTagArea: { position: 'absolute', top: '50%', zIndex: 5, width: '100%', alignItems: 'center' },
  resultTag: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, ...SHADOWS.medium },
  winTag: { backgroundColor: '#00D084' },
  loseTag: { backgroundColor: '#EF4444' },
  drawTag: { backgroundColor: '#73788B' },
  resultTagText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  controls: { padding: 30, backgroundColor: 'rgba(255,255,255,0.03)', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  controlTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  choicesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  choiceBtn: { width: (SCREEN_WIDTH - 100) / 3, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeChoice: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  choiceEmoji: { fontSize: 32, marginBottom: 5 },
  choiceLabel: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  gameOverOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 30 },
  gameOverContent: { width: '100%', backgroundColor: 'rgba(26, 28, 41, 0.98)', borderRadius: 30, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  gameOverTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 20 },
  gameOverSub: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 10 },
  bonusText: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginTop: 20 },
  restartBtn: { marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, width: '100%', alignItems: 'center' },
  restartText: { color: '#000', fontSize: 16, fontWeight: '900' },
  exitBtn: { marginTop: 15 },
  exitText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '800' },
  footerInfo: { paddingBottom: 40, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600' }
});
