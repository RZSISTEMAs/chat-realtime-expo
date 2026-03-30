import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, Animated, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = (SCREEN_WIDTH - 60) / GRID_SIZE;

const EMOJIS = ['🚀', '💎', '🔥', '🌈', '🐱', '🍕', '🎮', '💡', '🌟', '🍀'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGameScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Animações de flip para cada card
  const flipAnims = useRef(Array(16).fill(0).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const gameEmojis = [...EMOJIS.slice(0, 8), ...EMOJIS.slice(0, 8)];
    const shuffled = gameEmojis
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    
    setCards(shuffled);
    setSelectedCards([]);
    setMoves(0);
    setMatches(0);
    setIsGameOver(false);
    flipAnims.forEach(anim => anim.setValue(0));
  };

  const handlePress = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || selectedCards.length === 2) return;

    flipCard(index, true);
    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(moves + 1);
      checkMatch(newSelected);
    }
  };

  const flipCard = (index: number, toFlipped: boolean) => {
    const newCards = [...cards];
    newCards[index].isFlipped = toFlipped;
    setCards(newCards);

    Animated.timing(flipAnims[index], {
      toValue: toFlipped ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const checkMatch = (selected: number[]) => {
    const [first, second] = selected;
    if (cards[first].emoji === cards[second].emoji) {
      // Match!
      const newCards = [...cards];
      newCards[first].isMatched = true;
      newCards[second].isMatched = true;
      setCards(newCards);
      setSelectedCards([]);
      setMatches(matches + 1);

      if (matches + 1 === 8) {
        setIsGameOver(true);
        handleWin();
      }
    } else {
      // No match, flip back
      setTimeout(() => {
        flipCard(first, false);
        flipCard(second, false);
        setSelectedCards([]);
      }, 1000);
    }
  };

  const handleWin = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const points = 15;
        await axios.post(`${API_BASE}/games/add-points`, { userId: user.id, points });
        
        user.game_points = (user.game_points || 0) + points;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err) {
      console.error('Erro ao somar pontos:', err);
    }
  };

  const renderCard = ({ item, index }: { item: Card; index: number }) => {
    const rotateY = flipAnims[index].interpolate({
      inputRange: [0, 180],
      outputRange: ['0deg', '180deg'],
    });

    const backOpacity = flipAnims[index].interpolate({
      inputRange: [89, 90],
      outputRange: [0, 1],
    });

    const frontOpacity = flipAnims[index].interpolate({
      inputRange: [89, 90],
      outputRange: [1, 0],
    });

    return (
      <TouchableOpacity 
        style={styles.cardContainer} 
        onPress={() => handlePress(index)}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.card, { transform: [{ rotateY }] }]}>
          {/* Frente do Card (Escondido) */}
          <Animated.View style={[styles.cardFront, { opacity: frontOpacity }]}>
            <LinearGradient colors={['#a855f7', '#6366f1']} style={styles.cardGrad}>
              <Ionicons name="help" size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </Animated.View>

          {/* Verso do Card (Revelado) */}
          <Animated.View style={[styles.cardBack, { opacity: backOpacity, transform: [{ rotateY: '180deg' }] }]}>
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050510', '#1a1c29']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memória Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{moves}</Text>
          <Text style={styles.statLabel}>MOVIMENTOS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{matches}/8</Text>
          <Text style={styles.statLabel}>ACERTOS</Text>
        </View>
      </View>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={item => item.id.toString()}
        numColumns={GRID_SIZE}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
      />

      {isGameOver && (
        <View style={styles.overlay}>
          <LinearGradient colors={['rgba(168, 85, 247, 0.95)', 'rgba(99, 102, 241, 0.95)']} style={styles.winCard}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.winTitle}>Incrível!</Text>
            <Text style={styles.winSub}>Você completou em {moves} movimentos.</Text>
            <Text style={styles.winPoints}>+15 pontos acumulados! 💎</Text>
            
            <TouchableOpacity style={styles.playAgainBtn} onPress={initializeGame}>
              <Text style={styles.playAgainText}>Jogar Novamente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.backHubBtn} onPress={() => router.back()}>
              <Text style={styles.backHubText}>Voltar ao Hub</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>Encontre todos os pares para ganhar!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginVertical: 30 },
  statBox: { alignItems: 'center' },
  statVal: { color: COLORS.primary, fontSize: 28, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', marginTop: 4 },
  grid: { padding: 20, alignItems: 'center' },
  cardContainer: { width: CELL_SIZE, height: CELL_SIZE, margin: 5 },
  card: { flex: 1 },
  cardFront: { ...StyleSheet.absoluteFillObject, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardBack: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1A1C29', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  cardGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 32 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, padding: 30 },
  winCard: { width: '100%', padding: 40, borderRadius: 30, alignItems: 'center', ...SHADOWS.bold },
  winTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', marginTop: 10 },
  winSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', marginTop: 10 },
  winPoints: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginTop: 15 },
  playAgainBtn: { backgroundColor: '#FFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, marginTop: 30 },
  playAgainText: { color: '#000', fontSize: 16, fontWeight: '900' },
  backHubBtn: { marginTop: 20 },
  backHubText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  footerHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' }
});
