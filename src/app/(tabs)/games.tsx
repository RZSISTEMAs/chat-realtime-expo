import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform, FlatList, ActivityIndicator,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useSocket } from '../../context/SocketContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVE_GAMES = [
  { id: 'tic-tac-toe', title: 'Jogo da Velha', icon: 'grid-outline', color: '#a855f7', category: 'Tabuleiro', bg: ['#a855f7', '#6366f1'] as const },
  { id: 'memory', title: 'Memória', icon: 'apps-outline', color: '#00D084', category: 'Cérebro', bg: ['#00D084', '#009a63'] as const },
  { id: 'rps', title: 'Jokenpô', icon: 'hand-right-outline', color: '#FFD700', category: 'Duelo', bg: ['#FFD700', '#FFA500'] as const },
  { id: 'truco', title: 'Truco', icon: 'card-outline', color: '#EF4444', category: 'Cartas', bg: ['#EF4444', '#B91C1C'] as const },
];

const PENDING_GAMES = [
  { id: 'checkers', title: 'Damas', icon: 'grid-outline', color: '#F97316', category: 'Tabuleiro' },
  { id: '2048', title: '2048', icon: 'calculator-outline', color: '#3B82F6', category: 'Puzzle' },
  { id: 'quiz', title: 'Quiz Ayla', icon: 'help-circle-outline', color: '#EC4899', category: 'Conhecimento' },
  { id: 'naval', title: 'Batalha Naval', icon: 'boat-outline', color: '#0EA5E9', category: 'Estratégia' },
  { id: 'mines', title: 'Campo Minado', icon: 'warning-outline', color: '#64748B', category: 'Lógica' },
  { id: 'hearts', title: 'Copas', icon: 'heart-outline', color: '#7C3AED', category: 'Cartas' },
];

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
    </View>
  );
}

export default function GamesScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { socket } = useSocket();
  const [showOpponents, setShowOpponents] = useState<{visible: boolean, gameId: string}>({visible: false, gameId: ''});
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Sincroniza pontos ao abrir ou voltar para esta tela (vindo de um jogo)
  useFocusEffect(
    useCallback(() => {
      fetchData(false);
      return () => {};
    }, [])
  );


  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    // 1. Carrega usuário local primeiro (instantâneo)
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user); // Mostra dados locais imediatamente
        
        // 2. Tenta atualizar do servidor (pode falhar se offline)
        if (user && user.id) {
          try {
            const resUser = await axios.get(`${API_BASE}/users/profile/${user.id}`, { timeout: 5000 });
            if (resUser.data?.user) {
              setCurrentUser(resUser.data.user);
              await AsyncStorage.setItem('user', JSON.stringify(resUser.data.user));
            }
          } catch (profileErr) {
            // Silencioso: usa dados locais como fallback
            console.log('[Games] Perfil offline, usando cache local');
          }
        }
      }
    } catch (e) {
      console.log('[Games] Erro ao ler AsyncStorage');
    }

    // 3. Carrega leaderboard (independente do perfil)
    try {
      const resLeader = await axios.get(`${API_BASE}/games/leaderboard`, { timeout: 5000 });
      setLeaderboard(resLeader.data?.leaderboard || []);
    } catch (leaderErr) {
      console.log('[Games] Leaderboard offline');
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const sendInvite = (opponent: any) => {
    if (!socket || !currentUser) return;
    socket.emit('send_game_invite', {
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: opponent.id,
        gameId: showOpponents.gameId
    });
    Alert.alert("Convite Enviado!", `Aguardando ${opponent.name} aceitar...`);
    setShowOpponents({visible: false, gameId: ''});
  };

  const renderActiveCard = ({ item }: { item: typeof ACTIVE_GAMES[0] }) => (
    <View style={styles.gameCardWrapper}>
        <TouchableOpacity 
        style={styles.gameCard}
        onPress={() => router.push(`/games/${item.id}` as any)}
        activeOpacity={0.8}
        >
        <LinearGradient colors={item.bg} style={styles.gameCardGrad}>
            <View style={styles.gameIconBadge}>
                <Ionicons name={item.icon as any} size={28} color="#FFF" />
            </View>
            <View style={styles.gameCardInfo}>
                <Text style={styles.gameCardTitle}>{item.title}</Text>
                <View style={styles.gameCategoryBadge}>
                    <Text style={styles.gameCategoryText}>{item.category}</Text>
                </View>
            </View>
        </LinearGradient>
        </TouchableOpacity>
        
        {/* Botão Online Adicional */}
        <TouchableOpacity 
            style={styles.onlinePlayBtn} 
            onPress={async () => {
                const res = await axios.get(`${API_BASE}/users`); // Simples listagem de users para desafio
                setOnlineUsers(res.data.filter((u: any) => u.id !== currentUser?.id));
                setShowOpponents({ visible: true, gameId: item.id });
            }}
        >
            <Ionicons name="people" size={14} color="#FFF" />
            <Text style={styles.onlinePlayText}>ONLINE</Text>
        </TouchableOpacity>
    </View>
  );

  const renderPendingCard = ({ item }: { item: typeof PENDING_GAMES[0] }) => (
    <TouchableOpacity 
      style={styles.pendingCard}
      onPress={() => Alert.alert("Em Breve!", `Estamos configurando o ${item.title}. Volte em breve!`)}
      activeOpacity={0.7}
    >
        <BlurView intensity={20} tint="light" style={styles.pendingBlur}>
            <Ionicons name={item.icon as any} size={24} color="rgba(255,255,255,0.3)" />
            <Text style={styles.pendingCardTitle}>{item.title}</Text>
            <View style={styles.lockIcon}><Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.3)" /></View>
        </BlurView>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header com Pontuação RealTime */}
        <View style={styles.header}>
            <View>
                <Text style={styles.welcomeText}>Bem-vindo ao</Text>
                <Text style={styles.brandTitle}>NextGen Games Hub 💎</Text>
            </View>
            <View style={styles.scoreBadge}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.scoreText}>{currentUser?.game_points || 0}</Text>
                <Text style={styles.scoreLabel}>pts</Text>
            </View>
        </View>

        {/* Jogos Prontos */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nossa Coleção 🎮</Text>
            <View style={styles.activeCount}><Text style={styles.activeCountText}>4 Ativos</Text></View>
        </View>

        <FlatList
            data={ACTIVE_GAMES}
            renderItem={renderActiveCard}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gameGrid}
        />

        {/* Jogos Pendentes */}
        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
            <Text style={[styles.sectionTitle, { opacity: 0.4 }]}>Em Breve ✨</Text>
            <View style={styles.pendingTag}><Text style={styles.pendingTagText}>6 Pendentes</Text></View>
        </View>
        <FlatList
            data={PENDING_GAMES}
            renderItem={renderPendingCard}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gameGrid}
        />

        {/* Ranking Global */}
        <View style={styles.leaderboardSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ranking Global 🌍</Text>
            </View>
            <View style={styles.leaderboardCard}>
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} />
                ) : (
                    leaderboard.slice(0, 5).map((user, index) => (
                        <View key={user.id} style={styles.leaderboardItem}>
                            <Text style={[styles.rankNumber, index < 3 && styles.topRank]}>#{index + 1}</Text>
                            <Image source={{ uri: user.profile_pic || 'https://via.placeholder.com/150' }} style={styles.leaderAvatar} />
                            <Text style={styles.leaderName} numberOfLines={1}>{user.name}</Text>
                            <Text style={styles.leaderPoints}>{user.game_points} pts</Text>
                        </View>
                    ))
                )}
            </View>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal de Seleção de Oponente */}
      {showOpponents.visible && (
          <View style={styles.opponentsOverlay}>
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                <SafeAreaView style={{ flex: 1, padding: 25 }}>
                    <View style={styles.opponentsHeader}>
                        <Text style={styles.opponentsTitle}>Desafiar Alguém Online ⚔️</Text>
                        <TouchableOpacity onPress={() => setShowOpponents({visible: false, gameId: ''})}>
                            <Ionicons name="close-circle" size={32} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 50 }}>
                        {onlineUsers.length === 0 ? (
                            <Text style={styles.emptyOpponents}>Nenhum oponente disponível no momento...</Text>
                        ) : (
                            onlineUsers.map(u => (
                                <TouchableOpacity key={u.id} style={styles.opponentItem} onPress={() => sendInvite(u)}>
                                    <Image source={{ uri: u.profile_pic }} style={styles.opponentAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.opponentName}>{u.name}</Text>
                                        <Text style={styles.opponentStatus}>@ {u.username} • Ativo</Text>
                                    </View>
                                    <View style={styles.challengeBadge}><Text style={styles.challengeBadgeText}>DESAFIAR</Text></View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </SafeAreaView>
              </BlurView>
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
  scrollContent: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  brandTitle: { color: COLORS.primary, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  scoreBadge: { backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scoreText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: 8 },
  scoreLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginLeft: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  activeCount: { backgroundColor: 'rgba(168, 85, 247, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeCountText: { color: '#a855f7', fontSize: 10, fontWeight: '900' },
  pendingTag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingTagText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900' },
  gameGrid: { justifyContent: 'space-between', marginBottom: 15 },
  gameCardWrapper: { width: (SCREEN_WIDTH - 55) / 2, marginBottom: 15 },
  gameCard: { height: 110, borderRadius: 20, overflow: 'hidden' },
  gameCardGrad: { flex: 1, padding: 15, justifyContent: 'space-between' },
  gameIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  gameCardInfo: { gap: 4 },
  gameCardTitle: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  gameCategoryBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  gameCategoryText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },
  onlinePlayBtn: { backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 5, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  onlinePlayText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  opponentsOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  opponentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  opponentsTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  emptyOpponents: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 50 },
  opponentItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  opponentAvatar: { width: 44, height: 44, borderRadius: 22 },
  opponentName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  opponentStatus: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  challengeBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  challengeBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
  playIcon: { position: 'absolute', bottom: 12, right: 12, opacity: 0.4 },
  pendingCard: { width: (SCREEN_WIDTH - 55) / 2, height: 70, borderRadius: 18, overflow: 'hidden', marginBottom: 15 },
  pendingBlur: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  pendingCardTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700' },
  lockIcon: { position: 'absolute', top: 8, right: 8 },
  leaderboardSection: { marginTop: 10 },
  leaderboardCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 25, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rankNumber: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '900', width: 30 },
  topRank: { color: '#FFD700' },
  leaderAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  leaderName: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '700' },
  leaderPoints: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
});
