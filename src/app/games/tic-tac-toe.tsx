import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, Animated, Platform, ActivityIndicator,
  ScrollView, Image as RNImage
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
const CELL_SIZE = (SCREEN_WIDTH - 100) / 3;

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
    </View>
  );
}

export default function TicTacToeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string, room: string, opponentId: string }>();
  const { socket } = useSocket();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [gameMode, setGameMode] = useState<'solo' | 'ayla' | 'online' | null>(params.mode as any || null);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [mySymbol, setMySymbol] = useState<'X' | 'O'>('X');
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [waitingForAccept, setWaitingForAccept] = useState(false);

  const scaleAnims = useRef(Array(9).fill(0).map(() => new Animated.Value(0))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Refs para callbacks estáveis (evita stale closures nos listeners de Socket)
  const boardRef = useRef(board);
  boardRef.current = board;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  useEffect(() => {
    const loadUser = async () => {
        const str = await AsyncStorage.getItem('user');
        if (str) {
            const u = JSON.parse(str);
            setCurrentUser(u);
            if (params.mode === 'online' && params.opponentId) {
                // O jogador com menor ID é X e começa primeiro
                const iAmX = parseInt(u.id) < parseInt(params.opponentId);
                setMySymbol(iAmX ? 'X' : 'O');
                setIsMyTurn(iAmX); // X sempre começa
            }
        }
    };
    loadUser();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    
    if (params.mode === 'online' && socket && params.room) {
        // Entra na sala ao abrir o jogo
        socket.emit('join_game_room', params.room);
        
        socket.on('receive_game_move', (data: any) => {
            const idx = data.move;
            const opSymbol = data.symbol;
            
            setBoard(prev => {
                const nb = [...prev];
                nb[idx] = opSymbol;
                
                const winInfo = calculateWinnerStatic(nb);
                if (winInfo) {
                    setWinner(winInfo.winner);
                    setWinningLine(winInfo.line);
                } else if (nb.every(sq => sq !== null)) {
                    setWinner('Draw');
                }
                
                return nb;
            });
            
            Animated.spring(scaleAnims[idx], { toValue: 1, friction: 5, useNativeDriver: true }).start();
            setIsMyTurn(true);
        });
    }
    if (socket) {
        socket.on('game_invite_accepted', (data: any) => {
            if (data.gameId !== 'tic-tac-toe') return;
            setWaitingForAccept(false);
            socket.emit('join_game_room', data.room);
            const myId = userRef.current?.id;
            const iAmX = parseInt(myId) < parseInt(data.receiverId);
            setMySymbol(iAmX ? 'X' : 'O');
            setIsMyTurn(iAmX);
            setGameMode('online');
            resetGame();
        });

        socket.on('game_invite_rejected', () => {
            setWaitingForAccept(false);
            Alert.alert("Convite Negado", "O oponente recusou o desafio.");
        });
    }

    return () => {
        socket?.off('receive_game_move');
        socket?.off('game_invite_accepted');
        socket?.off('game_invite_rejected');
    };
  }, []);

  // Função estática para calcular vencedor (sem depender de state)
  const calculateWinnerStatic = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const handlePress = (index: number) => {
    // Bloqueia: célula ocupada, jogo acabou, não é minha vez (IA ou Online)
    if (board[index] || winner) return;
    if (gameMode === 'ayla' && !isMyTurn) return;
    if (gameMode === 'online' && !isMyTurn) return;

    const newBoard = [...board];
    const symbol = gameMode === 'online' ? mySymbol : (isMyTurn ? 'X' : 'O');
    newBoard[index] = symbol;
    setBoard(newBoard);
    
    // Envia para o oponente se estiver online
    if (gameMode === 'online' && socket && params.room) {
        socket.emit('send_game_move', { room: params.room, move: index, symbol: mySymbol });
        setIsMyTurn(false); // Trava minha vez
    }

    // Animação suave
    Animated.spring(scaleAnims[index], { toValue: 1, friction: 5, useNativeDriver: true }).start();

    const winInfo = calculateWinnerStatic(newBoard);
    if (winInfo) {
      setWinner(winInfo.winner);
      setWinningLine(winInfo.line);
      // Dá pontos se eu ganhei contra IA ou Online
      if (winInfo.winner === mySymbol && (gameMode === 'ayla' || gameMode === 'online')) {
          handleWin();
      }
    } else if (newBoard.every(sq => sq !== null)) {
      setWinner('Draw');
    } else if (gameMode !== 'online') {
      setIsMyTurn(!isMyTurn);
    }
  };

  useEffect(() => {
    if (gameMode === 'ayla' && !isMyTurn && !winner) {
      setTimeout(makeAylaMove, 800);
    }
  }, [isMyTurn, gameMode, winner]);

  const makeAylaMove = () => {
    const emptySquares = board.map((val, idx) => (val === null ? idx : null)).filter(val => val !== null);
    if (emptySquares.length === 0) return;

    let move = -1;
    move = findBestMove(board, 'O');
    if (move === -1) move = findBestMove(board, 'X');
    if (move === -1) move = board[4] === null ? 4 : (emptySquares[Math.floor(Math.random() * emptySquares.length)] as number);

    const newBoard = [...board];
    newBoard[move] = 'O';
    setBoard(newBoard);
    Animated.spring(scaleAnims[move], { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

    const winInfo = calculateWinnerStatic(newBoard);
    if (winInfo) {
      setWinner(winInfo.winner);
      setWinningLine(winInfo.line);
    } else if (newBoard.every(sq => sq)) {
      setWinner('Draw');
    } else {
      setIsMyTurn(true);
    }
  };

  const findBestMove = (squares: any[], player: string) => {
    for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
            const temp = [...squares];
            temp[i] = player;
            if (calculateWinnerStatic(temp)) return i;
        }
    }
    return -1;
  };

  const handleWin = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const points = gameMode === 'ayla' ? 10 : 25;
        await axios.post(`${API_BASE}/games/add-points`, { userId: user.id, points });
        user.game_points = (user.game_points || 0) + points;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err) {}
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsMyTurn(true);
    setWinner(null);
    setWinningLine(null);
    scaleAnims.forEach((anim: Animated.Value) => anim.setValue(0));
  };

  const renderCell = (index: number) => {
    const isWinningCell = winningLine?.includes(index);
    return (
      <TouchableOpacity 
        key={index}
        style={[styles.cell, isWinningCell && styles.winningCell]}
        activeOpacity={0.7}
        onPress={() => handlePress(index)}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
          {board[index] === 'X' && (
            <Ionicons name="close" size={50} color="#a855f7" style={styles.shadowX} />
          )}
          {board[index] === 'O' && (
            <Ionicons name="radio-button-off" size={40} color="#FFD700" style={styles.shadowO} />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <LinearGradient colors={['rgba(5, 5, 16, 0.5)', '#050510']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tic-Tac-Toe Royale</Text>
            <View style={{ width: 40 }} />
        </View>

        {!gameMode ? (
          <Animated.View style={[styles.modeSelection, { opacity: fadeAnim }]}>
              <View style={styles.heroSection}>
                <View style={styles.heroIconCircle}>
                    <Ionicons name="grid" size={40} color="#a855f7" />
                </View>
                <Text style={styles.selectionTitle}>Desafie a Inteligência</Text>
                <Text style={styles.selectionSub}>Escolha seu oponente e acumule pontos no Ranking!</Text>
              </View>
              
              <View style={styles.modeCards}>
                <TouchableOpacity style={styles.modeCard} onPress={() => setGameMode('solo')}>
                    <BlurView intensity={20} tint="light" style={styles.modeCardBlur}>
                        <LinearGradient colors={['rgba(59, 130, 246, 0.1)', 'transparent']} style={styles.modeCardGrad}>
                            <Ionicons name="person" size={28} color="#3B82F6" />
                            <Text style={styles.modeCardText}>Solo</Text>
                            <Text style={styles.modeCardDesc}>Treino Local</Text>
                        </LinearGradient>
                    </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modeCard} onPress={() => setGameMode('ayla')}>
                    <BlurView intensity={30} tint="light" style={styles.modeCardBlur}>
                        <LinearGradient colors={['rgba(168, 85, 247, 0.2)', 'transparent']} style={styles.modeCardGrad}>
                            <View style={styles.pointsBadge}><Text style={styles.pointsBadgeText}>+10 pts</Text></View>
                            <Ionicons name="sparkles" size={28} color="#a855f7" />
                            <Text style={styles.modeCardText}>Ayla IA</Text>
                            <Text style={styles.modeCardDesc}>Bot Inteligente</Text>
                        </LinearGradient>
                    </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modeCard} onPress={async () => {
                    try {
                        const res = await axios.get(`${API_BASE}/users`);
                        const me = currentUser?.id;
                        setOnlineUsers(res.data.filter((u: any) => u.id !== me));
                        setShowOnlineList(true);
                    } catch (e) {
                        Alert.alert("Erro", "Não foi possível carregar oponentes.");
                    }
                }}>
                    <BlurView intensity={20} tint="light" style={styles.modeCardBlur}>
                        <LinearGradient colors={['rgba(0, 208, 132, 0.1)', 'transparent']} style={styles.modeCardGrad}>
                            <View style={styles.pointsBadge}><Text style={styles.pointsBadgeText}>+25 pts</Text></View>
                            <Ionicons name="people" size={28} color="#00D084" />
                            <Text style={styles.modeCardText}>Online</Text>
                            <Text style={styles.modeCardDesc}>Duelo Real</Text>
                        </LinearGradient>
                    </BlurView>
                </TouchableOpacity>
              </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.gameArea, { opacity: fadeAnim }]}>
              <View style={styles.turnIndicator}>
                  <View style={[styles.playerTile, isMyTurn && styles.activeTileX]}>
                      <Ionicons name="close" size={20} color={isMyTurn ? "#FFF" : "#a855f7"} />
                      <Text style={[styles.playerTileText, isMyTurn && {color: '#FFF'}]}>Você</Text>
                  </View>
                  <View style={styles.vsDivider} />
                  <View style={[styles.playerTile, !isMyTurn && styles.activeTileO]}>
                      <Ionicons name="radio-button-off" size={18} color={!isMyTurn ? "#FFF" : "#FFD700"} />
                      <Text style={[styles.playerTileText, !isMyTurn && {color: '#FFF'}]}>{gameMode === 'ayla' ? 'Ayla IA' : 'Oponente'}</Text>
                  </View>
              </View>

              <View style={styles.boardWrapper}>
                  <BlurView intensity={10} tint="light" style={styles.boardGlass}>
                      <View style={styles.boardGrid}>
                          <View style={styles.row}>
                            {renderCell(0)}
                            {renderCell(1)}
                            {renderCell(2)}
                          </View>
                          <View style={styles.row}>
                            {renderCell(3)}
                            {renderCell(4)}
                            {renderCell(5)}
                          </View>
                          <View style={styles.row}>
                            {renderCell(6)}
                            {renderCell(7)}
                            {renderCell(8)}
                          </View>
                      </View>
                  </BlurView>
              </View>

              {!winner && (
                  <View style={styles.statusFooter}>
                      {isMyTurn ? (
                        <Text style={styles.statusMsg}>Sua vez de jogar! ⚡</Text>
                      ) : (
                        <View style={styles.aylaLoading}>
                            <ActivityIndicator color="#a855f7" size="small" />
                            <Text style={styles.aylaLoadingText}>{gameMode === 'online' ? 'Aguardando oponente...' : 'Ayla calculando jogada...'}</Text>
                        </View>
                      )}
                  </View>
              )}
          </Animated.View>
        )}
      </SafeAreaView>

      {winner && (
        <View style={styles.winnerOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={styles.winnerCard}>
            <LinearGradient colors={['#a855f7', '#6366f1']} style={styles.winnerCardGrad}>
                <Ionicons name={winner === 'Draw' ? 'hand-right' : 'trophy'} size={60} color="#FFD700" />
                <Text style={styles.winnerTitle}>
                    {winner === 'Draw' ? 'EMPATE!' : (winner === mySymbol ? 'VITÓRIA! ✨' : 'DERROTA!') }
                </Text>
                {winner === mySymbol && (gameMode === 'ayla' || gameMode === 'online') && (
                    <Text style={styles.pointsWon}>+{gameMode === 'ayla' ? 10 : 25} Pontos Acumulados</Text>
                )}
                <TouchableOpacity style={styles.winResetBtn} onPress={resetGame}>
                    <Text style={styles.winResetText}>JOGAR NOVAMENTE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.winQuitBtn} onPress={() => router.back()}>
                    <Text style={styles.winQuitText}>VOLTAR AO HUB</Text>
                </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* Modal: Lista de Oponentes Online */}
      {showOnlineList && (
          <View style={styles.onlineOverlay}>
              <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
              <SafeAreaView style={styles.onlineContent}>
                  <View style={styles.onlineHeader}>
                      <Text style={styles.onlineTitle}>Desafiar Oponente ⚔️</Text>
                      <TouchableOpacity onPress={() => setShowOnlineList(false)}>
                          <Ionicons name="close-circle" size={32} color="#FFF" />
                      </TouchableOpacity>
                  </View>
                  <Text style={styles.onlineSubtitle}>Escolha alguém para uma partida de Jogo da Velha</Text>
                  
                  <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 50, paddingTop: 15 }}>
                      {onlineUsers.length === 0 ? (
                          <Text style={styles.emptyText}>Nenhum jogador disponível...</Text>
                      ) : (
                          onlineUsers.map(u => (
                              <TouchableOpacity key={u.id} style={styles.opponentRow} onPress={() => {
                                  if (!socket || !userRef.current) return;
                                  socket.emit('send_game_invite', {
                                      senderId: userRef.current.id,
                                      senderName: userRef.current.name,
                                      receiverId: u.id,
                                      gameId: 'tic-tac-toe'
                                  });
                                  setShowOnlineList(false);
                                  setWaitingForAccept(true);
                                  Alert.alert("Convite Enviado! 📩", `Aguardando ${u.name} aceitar...`);
                              }}>
                                  <RNImage source={{ uri: u.profile_pic || 'https://via.placeholder.com/100' }} style={styles.opAvatar} />
                                  <View style={{ flex: 1 }}>
                                      <Text style={styles.opName}>{u.name}</Text>
                                      <Text style={styles.opUser}>@{u.username}</Text>
                                  </View>
                                  <View style={styles.challengeBtn}>
                                      <Ionicons name="flash" size={14} color="#000" />
                                      <Text style={styles.challengeText}>DESAFIAR</Text>
                                  </View>
                              </TouchableOpacity>
                          ))
                      )}
                  </ScrollView>
              </SafeAreaView>
          </View>
      )}

      {/* Overlay: Aguardando aceite */}
      {waitingForAccept && (
          <View style={styles.waitingOverlay}>
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.waitingText}>Aguardando resposta do oponente...</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWaitingForAccept(false)}>
                  <Text style={styles.cancelText}>CANCELAR</Text>
              </TouchableOpacity>
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  auroraContainer: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
  blob: { position: 'absolute', borderRadius: 300, opacity: 0.15 },
  blob1: { width: 350, height: 350, backgroundColor: '#a855f7', top: -100, left: -80 },
  blob2: { width: 300, height: 300, backgroundColor: '#6366f1', bottom: -50, right: -80 },
  blob3: { width: 200, height: 200, backgroundColor: '#00D084', top: '40%', right: -60, opacity: 0.1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 80, paddingTop: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  modeSelection: { flex: 1, padding: 25 },
  heroSection: { alignItems: 'center', marginVertical: 40 },
  heroIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(168, 85, 247, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  selectionTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  selectionSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  modeCards: { gap: 15, marginTop: 20 },
  modeCard: { height: 100, borderRadius: 25, overflow: 'hidden' },
  modeCardBlur: { flex: 1 },
  modeCardGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 20 },
  modeCardText: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  modeCardDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', position: 'absolute', right: 25, bottom: 20 },
  pointsBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pointsBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
  gameArea: { flex: 1, alignItems: 'center', paddingTop: 20 },
  turnIndicator: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 25, padding: 6, alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  playerTile: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  activeTileX: { backgroundColor: '#a855f7' },
  activeTileO: { backgroundColor: '#FFD700' },
  playerTileText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900', fontSize: 14 },
  vsDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
  boardWrapper: { ...SHADOWS.bold },
  boardGlass: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  boardGrid: { width: SCREEN_WIDTH - 50, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  winningCell: { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#a855f7' },
  shadowX: { textShadowColor: '#a855f7', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  shadowO: { textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  statusFooter: { marginTop: 40 },
  statusMsg: { color: COLORS.primary, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  aylaLoading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aylaLoadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  winnerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 30 },
  winnerCard: { width: '100%', borderRadius: 35, overflow: 'hidden', elevation: 20 },
  winnerCardGrad: { padding: 40, alignItems: 'center' },
  winnerTitle: { color: '#FFF', fontSize: 40, fontWeight: '900', marginTop: 20, textAlign: 'center' },
  pointsWon: { color: '#FFD700', fontSize: 18, fontWeight: '900', marginTop: 10 },
  winResetBtn: { backgroundColor: '#FFF', width: '100%', height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 35 },
  winResetText: { color: '#000', fontSize: 16, fontWeight: '900' },
  winQuitBtn: { marginTop: 20 },
  winQuitText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  // Online Selection Modal
  onlineOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  onlineContent: { flex: 1, padding: 25 },
  onlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  onlineTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  onlineSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 60, fontSize: 15 },
  opponentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  opAvatar: { width: 48, height: 48, borderRadius: 24 },
  opName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  opUser: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  challengeBtn: { backgroundColor: '#00D084', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  challengeText: { color: '#000', fontSize: 11, fontWeight: '900' },
  // Waiting overlay
  waitingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1001, justifyContent: 'center', alignItems: 'center', gap: 20 },
  waitingText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },
  cancelBtn: { marginTop: 10, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900' },
});
