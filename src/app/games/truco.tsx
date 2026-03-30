import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, Animated, FlatList, Image
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
import { useSocket } from '../../context/SocketContext';
import { useLocalSearchParams } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Definição das Cartas e Força (Simplificado para Truco Paulista)
const SUITS = ['♦', '♠', '♥', '♣'];
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

interface Card {
  id: string;
  rank: string;
  suit: string;
  power: number;
  image?: string;
}

export default function TrucoGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string, room: string, opponentId: string }>();
  const { socket } = useSocket();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Estados do Jogo
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aylaHand, setAylaHand] = useState<Card[]>([]);
  const [playedCards, setPlayedCards] = useState<{player: Card | null, ayla: Card | null}[]>([]);
  const [roundWinner, setRoundWinner] = useState<number[]>([]); // 1: Player, 2: Ayla, 3: Empate
  const [matchScore, setMatchScore] = useState({ player: 0, ayla: 0 });
  const [handValue, setHandValue] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState<'playing' | 'ended'>('playing');

  useEffect(() => {
    const loadUser = async () => {
        const str = await AsyncStorage.getItem('user');
        if (str) {
            const u = JSON.parse(str);
            setCurrentUser(u);
            // Se for online e eu for o 'mestre' (id menor), eu começo a mão
            if (params.mode === 'online' && params.opponentId) {
                const isMaster = parseInt(u.id) < parseInt(params.opponentId);
                if (isMaster) startNewHand();
            } else {
                startNewHand();
            }
        }
    };
    loadUser();

    if (params.mode === 'online' && socket && params.room) {
        socket.on('receive_game_move', (data: any) => {
            if (data.type === 'card') handleRemotePlay(data.card);
            if (data.type === 'truco') handleRemoteTruco();
            if (data.type === 'deck') handleRemoteDeck(data.deck, data.starter);
        });
    }

    return () => {
        socket?.off('receive_game_move');
    };
  }, [params.mode]);

  const handleRemoteDeck = (deck: Card[], starter: boolean) => {
      setPlayerHand(deck.slice(3, 6)); // Recebedor pega a segunda metade
      setAylaHand(deck.slice(0, 3)); // Na visão dele, o outro é a "Ayla"
      setIsPlayerTurn(starter); // Oponente define quem começa
  };

  const startNewHand = () => {
    if (params.mode === 'online' && socket && params.room) {
        // Apenas o jogador com ID menor embaralha
        const isMaster = parseInt(currentUser?.id) < parseInt(params.opponentId);
        if (!isMaster) return; 

        const deck = shuffleDeck();
        const starter = Math.random() > 0.5;
        socket.emit('send_game_move', { room: params.room, type: 'deck', deck, starter: !starter });
        
        setPlayerHand(deck.slice(0, 3));
        setAylaHand(deck.slice(3, 6));
        setIsPlayerTurn(starter);
    } else {
        const deck = shuffleDeck();
        setPlayerHand(deck.slice(0, 3));
        setAylaHand(deck.slice(3, 6));
        const starter = Math.random() > 0.5;
        setIsPlayerTurn(starter);
        if (!starter) setTimeout(() => makeAylaMove(), 600);
    }
    
    setPlayedCards([]);
    setRoundWinner([]);
    setHandValue(1);
  };

  const shuffleDeck = (): Card[] => {
    let cards: Card[] = [];
    RANKS.forEach((rank, rIdx) => {
      SUITS.forEach((suit, sIdx) => {
        cards.push({
          id: `${rank}${suit}`,
          rank,
          suit,
          power: rIdx, // Simplificado, manilhas seriam ajustadas com o Vira
        });
      });
    });
    return cards.sort(() => Math.random() - 0.5);
  };

  const playCard = (card: Card, isPlayer: boolean) => {
    if (!isPlayerTurn && isPlayer) return;

    // Lógica básica de rodada
    const currentPlayed = [...playedCards];
    const lastIdx = currentPlayed.length - 1;

    if (isPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
      if (currentPlayed.length === 0 || currentPlayed[lastIdx].player !== null) {
          currentPlayed.push({ player: card, ayla: null });
      } else {
          currentPlayed[lastIdx].player = card;
      }
    } else {
        if (currentPlayed.length === 0 || currentPlayed[lastIdx].ayla !== null) {
            currentPlayed.push({ player: null, ayla: card });
        } else {
            currentPlayed[lastIdx].ayla = card;
        }
    }

    setPlayedCards(currentPlayed);
    
    if (isPlayer && params.mode === 'online' && socket) {
        socket.emit('send_game_move', { room: params.room, type: 'card', card });
    }

    // Verifica se completou uma vaza
    const last = currentPlayed[currentPlayed.length - 1];
    if (last.player && last.ayla) {
        determineRoundWinner(last.player, last.ayla);
    } else {
        setIsPlayerTurn(!isPlayer);
    }
  };

  const determineRoundWinner = (pCard: Card, aCard: Card) => {
     let result = 3; // Empate
     if (pCard.power > aCard.power) result = 1;
     else if (aCard.power > pCard.power) result = 2;

     const newWinners = [...roundWinner, result];
     setRoundWinner(newWinners);

     // Próxima vaza ou fim da mão
     if (!checkHandEnd(newWinners)) {
         setIsPlayerTurn(result === 1 || result === 3); 
         if (result === 2) setTimeout(() => makeAylaMove(), 800);
     }
  };

  const checkHandEnd = (winners: number[]): boolean => {
      let pWins = winners.filter(w => w === 1).length;
      let aWins = winners.filter(w => w === 2).length;
      let draws = winners.filter(w => w === 3).length;

      let handWinner: 'player' | 'ayla' | null = null;

      // Lógica clássica de Truco
      if (pWins === 2) handWinner = 'player';
      else if (aWins === 2) handWinner = 'ayla';
      else if (winners.length === 3) {
          if (pWins > aWins) handWinner = 'player';
          else if (aWins > pWins) handWinner = 'ayla';
          else handWinner = winners[0] === 1 ? 'player' : 'ayla';
      } else if (draws > 0) {
          if (winners.length === 1 && draws === 1) return false;
          if (winners.length === 2 && draws === 2) return false;
          // Regra de quem "amarra"
          if (pWins === 1) handWinner = 'player';
          else if (aWins === 1) handWinner = 'ayla';
      }

      if (handWinner) {
          const winAmount = handValue;
          const newScore = { ...matchScore };
          if (handWinner === 'player') newScore.player += winAmount;
          else newScore.ayla += winAmount;
          
          setMatchScore(newScore);

          if (newScore.player >= 12 || newScore.ayla >= 12) {
              setGameStatus('ended');
              if (newScore.player >= 12) handleWin();
          } else {
              // Quem ganha a vaza começa a próxima
              setIsPlayerTurn(handWinner === 'player');
              if (handWinner === 'ayla') setTimeout(() => makeAylaMove(), 1500);
              else setTimeout(startNewHand, 1500);
          }
          return true;
      }
      return false;
  };

  const handleRemotePlay = (card: Card) => {
      setAylaHand(prev => prev.filter(c => c.id !== card.id));
      playCard(card, false);
  };

  const makeAylaMove = () => {
    if (params.mode === 'online') return; // IA desativada no online
    if (aylaHand.length === 0 || gameStatus === 'ended') return;
    const cardToPlay = aylaHand[0]; // Simplificado: IA joga a primeira carta
    setAylaHand(prev => prev.slice(1));
    playCard(cardToPlay, false);
  };

  const handleWin = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const points = 50; 
        await axios.post(`${API_BASE}/games/add-points`, { userId: user.id, points });
        
        // Sincroniza localmente para o Hub atualizar instantaneamente
        user.game_points = (user.game_points || 0) + points;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (e) {
      console.error("Erro ao salvar pontos Truco:", e);
    }
  };

  const handleRemoteTruco = () => {
      setHandValue(prev => prev === 1 ? 3 : (prev === 3 ? 6 : (prev === 6 ? 9 : 12)));
      Alert.alert("Duelo! ⚔️", "Seu oponente pediu TRUCO! Você aceita automaticamente.");
  };

  const askTruco = () => {
      if (params.mode === 'online' && socket) {
          socket.emit('send_game_move', { room: params.room, type: 'truco' });
      }
      // Automático por enquanto para teste
      setHandValue(prev => prev === 1 ? 3 : (prev === 3 ? 6 : (prev === 6 ? 9 : 12)));
      Alert.alert("TRUCO! 👊", `O pedido foi enviado! Rodada vale ${handValue === 1 ? 3 : (handValue === 3 ? 6 : (handValue === 6 ? 9 : 12))} pontos!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050510', '#1a2a1a']} style={StyleSheet.absoluteFill} />
      
      {/* Mesa de Jogo */}
      <View style={styles.table}>
          {/* Topo: Score e Ayla */}
          <View style={styles.aylaArea}>
              <View style={styles.scoreBoard}>
                  <Text style={styles.scoreText}>VOCÊ {matchScore.player} x {matchScore.ayla} {params.mode === 'online' ? 'OPONENTE' : 'AYLA'}</Text>
                  <Text style={styles.handValText}>Vale: {handValue}</Text>
              </View>
              <View style={styles.aylaCards}>
                  {aylaHand.map((_, i) => (
                      <View key={i} style={styles.cardBack} />
                  ))}
              </View>
          </View>

          {/* Centro: Cartas Jogadas */}
          <View style={styles.centerMesa}>
              {playedCards.map((vaza, i) => (
                  <View key={i} style={styles.vazaRow}>
                      {vaza.ayla && <View style={styles.miniCard}><Text style={styles.cardText}>{vaza.ayla.rank}{vaza.ayla.suit}</Text></View>}
                      {vaza.player && <View style={[styles.miniCard, styles.miniCardPlayer]}><Text style={styles.cardText}>{vaza.player.rank}{vaza.player.suit}</Text></View>}
                  </View>
              ))}
          </View>

          {/* Base: Player */}
          <View style={styles.playerArea}>
              <View style={styles.playerHand}>
                  {playerHand.map((card, i) => (
                      <TouchableOpacity key={i} style={styles.playerCard} onPress={() => playCard(card, true)}>
                         <Text style={[styles.cardRank, (card.suit === '♥' || card.suit === '♦') && {color: 'red'}]}>{card.rank}</Text>
                         <Text style={[styles.cardSuit, (card.suit === '♥' || card.suit === '♦') && {color: 'red'}]}>{card.suit}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
              
              <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.trucoBtn} onPress={askTruco}>
                      <Text style={styles.trucoBtnText}>TRUCO!</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </View>

      {gameStatus === 'ended' && (
          <View style={styles.overlay}>
              <Text style={styles.winTitle}>{matchScore.player >= 12 ? 'GANHOU O JOGO! 🎉' : 'AYLA GANHOU! 😢'}</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {setMatchScore({player:0, ayla:0}); setGameStatus('playing'); startNewHand();}}>
                  <Text style={styles.resetBtnText}>Novo Jogo</Text>
              </TouchableOpacity>
          </View>
      )}

      {/* Header com Voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  header: { position: 'absolute', top: 20, left: 15, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  table: { flex: 1, padding: 20, justifyContent: 'space-between' },
  aylaArea: { alignItems: 'center', marginTop: 40 },
  scoreBoard: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, alignItems: 'center' },
  scoreText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  handValText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 5 },
  aylaCards: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cardBack: { width: 40, height: 60, backgroundColor: '#2C3E50', borderRadius: 5, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FFF' },
  centerMesa: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazaRow: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  miniCard: { width: 50, height: 75, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  miniCardPlayer: { borderColor: COLORS.primary, borderWidth: 2 },
  cardText: { fontSize: 18, fontWeight: '900', color: '#000' },
  playerArea: { alignItems: 'center', marginBottom: 20 },
  playerHand: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  playerCard: { width: 80, height: 120, backgroundColor: '#FFF', borderRadius: 12, padding: 10, justifyContent: 'space-between', elevation: 10 },
  cardRank: { fontSize: 24, fontWeight: '900', color: '#000' },
  cardSuit: { fontSize: 32, textAlign: 'right', color: '#000' },
  actionRow: { flexDirection: 'row', gap: 20 },
  trucoBtn: { backgroundColor: '#EF4444', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, ...SHADOWS.medium },
  trucoBtnText: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  winTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  resetBtn: { marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 20 },
  resetBtnText: { color: '#000', fontSize: 18, fontWeight: '900' }
});
