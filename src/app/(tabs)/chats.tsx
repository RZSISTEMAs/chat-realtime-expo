import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, ScrollView, Modal, Dimensions, Platform, Alert, Animated, PanResponder, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { API_BASE, API_URL } from '../../constants/api';
import io from 'socket.io-client';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

import { useFocusEffect } from 'expo-router';
import ProfileModal from '../../components/ProfileModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
    </View>
  );
}

export default function ChatsScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  
  // Modal Status
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusViewers, setStatusViewers] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const timerRef = useRef<any>(null);

  const router = useRouter();

  // Recarrega informações do usuário sempre que a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      loadInfo();
    }, [])
  );

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      const newSocket = io(API_URL, {
        transports: ['websocket'],
        reconnection: true
      });
      setSocket(newSocket);

      const onConnect = () => {
        console.log('Socket conectado:', newSocket.id);
        newSocket.emit('join', currentUser.id);
      };

      if (newSocket.connected) {
        onConnect();
      } else {
        newSocket.on('connect', onConnect);
      }
      
      newSocket.on('receive_message', async (msg: any) => {
        fetchData(currentUser.id);
        
        // SÓ disparar alerta se for mensagem de OUTRA pessoa
        if (msg.sender_id !== currentUser.id) {
          // Vibração e som apenas em dispositivos móveis
          if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 200, 100, 200]);
            try {
              const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' }
              );
              await sound.playAsync();
            } catch (err) { console.log('Erro ao tocar som', err); }
          }

          // Mostrar Notificação completa (Apenas se NÃO estiver na Web)
          if (Platform.OS !== 'web') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `Nova mensagem de ${msg.sender_name || 'Alguém'}`,
                body: msg.media_type === 'text' ? msg.content_text : '📷 Foto recebida',
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });
          }
        }
      });

      newSocket.on('update_online_users', (users: any[]) => {
        console.log('[Socket] Usuários online brutos recebidos:', users.length, users);
        const filtered = users.filter(u => {
            const uid = Number(u.id);
            const myId = Number(currentUser.id);
            const isMe = uid === myId;
            return !isNaN(uid) && !isMe;
        });
        setOnlineUsers(filtered);
      });

      newSocket.on('user_updated', (updatedUser: any) => {
        if (!updatedUser || !updatedUser.id) return;
        
        console.log('[Socket] Usuário atualizado recebido:', updatedUser.username);
        
        // 1. Atualizar na lista de usuários online
        setOnlineUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        
        // 2. Atualizar na lista de chats recentes (Merge inteligente para não apagar fotos)
        setChats(prev => prev.map(c => {
          if (c.id === updatedUser.id) {
            return {
              ...c,
              ...updatedUser,
              // Garante que se o novo profile_pic for nulo, mantemos o antigo
              profile_pic: updatedUser.profile_pic || c.profile_pic,
              name: updatedUser.name || c.name,
            };
          }
          return c;
        }));

        // 3. Se o perfil desse usuário estiver aberto no modal, atualiza ele também
        setSelectedProfileUser((prev: any) => {
          if (prev && prev.id === updatedUser.id) {
            return { 
              ...prev, 
              ...updatedUser,
              profile_pic: updatedUser.profile_pic || prev.profile_pic,
              name: updatedUser.name || prev.name,
            };
          }
          return prev;
        });
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser?.id]);

  const loadInfo = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    fetchData(user.id);
  };

  const fetchData = async (userId: number) => {
    setLoading(true);
    try {
      const [histRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/chats/history/${userId}`),
        axios.get(`${API_BASE}/status`)
      ]);
      setChats(histRes.data);
      setStatuses(statusRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const registerStatusView = async (statusId: number) => {
    if (!currentUser) return;
    try {
      await axios.post(`${API_URL}/api/status/view`, { statusId, userId: currentUser.id });
    } catch (err) {
      console.error('Erro ao registrar view:', err);
    }
  };

  const reactToStatus = async (statusId: number, reaction: string) => {
    if (!currentUser) return;
    try {
      await axios.post(`${API_URL}/api/status/react`, { statusId, userId: currentUser.id, reaction });
      Alert.alert('Reagido!', `Você reagiu com ${reaction}`);
    } catch (err) {
      console.error('Erro ao reagir:', err);
    }
  };

  const fetchStatusViewers = async (statusId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/status/${statusId}/viewers`);
      setStatusViewers(res.data);
    } catch (err) {
      console.error('Erro ao buscar visualizadores:', err);
    }
  };

  // PanResponder para Gestos de Swipe (Deslize)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
        return Math.abs(gestureState.dx) > 20; // Sensibilidade do deslize
      },
      onPanResponderRelease: (_: any, gestureState: any) => {
        if (gestureState.dx > 50) {
          handlePrevStatus(); // Deslizou para Direita -> Anterior
        } else if (gestureState.dx < -50) {
          handleNextStatus(); // Deslizou para Esquerda -> Próximo
        }
      },
    })
  ).current;

  // Logica de navegação automática
  useEffect(() => {
    if (showStatusModal && selectedStatus) {
      startStatusTimer();
    } else {
      stopStatusTimer();
    }
    return () => stopStatusTimer();
  }, [showStatusModal, selectedStatus]);

  const startStatusTimer = () => {
    stopStatusTimer();
    timerRef.current = setTimeout(() => {
      handleNextStatus();
    }, 5000); // 5 segundos
  };

  const stopStatusTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleNextStatus = () => {
    const currentIndex = statuses.findIndex(s => s.id === selectedStatus?.id);
    if (currentIndex < statuses.length - 1) {
      const next = statuses[currentIndex + 1];
      setSelectedStatus(next);
      registerStatusView(next.id);
      if (currentUser?.id === next.user_id) {
        fetchStatusViewers(next.id);
      }
    } else {
      setShowStatusModal(false);
      setSelectedStatus(null);
    }
  };

  const handlePrevStatus = () => {
    const currentIndex = statuses.findIndex(s => s.id === selectedStatus?.id);
    if (currentIndex > 0) {
      const prev = statuses[currentIndex - 1];
      setSelectedStatus(prev);
      if (currentUser?.id === prev.user_id) {
        fetchStatusViewers(prev.id);
      }
    }
  };

  const openChat = (item: any) => {
    router.push({
      pathname: `/chat/${item.id}` as any,
      params: { contactName: item.name, contactUser: item.username, contactPic: item.profile_pic }
    });
  };

  const pickStatusMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      const type = result.assets[0].type === 'video' ? 'video' : 'image';
      postStatus(uri, type);
    }
  };

  const postStatus = async (uri: string, type: 'image' | 'video') => {
    try {
      setLoading(true);
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'status.jpg';
      const ext = filename.split('.').pop();
      formData.append('media', { uri, name: filename, type: `${type}/${ext}` } as any);
      const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await axios.post(`${API_BASE}/status`, {
        userId: currentUser.id,
        mediaUrl: `${API_URL}${uploadRes.data.media_url}`,
        mediaType: type,
      });
      Alert.alert('Sucesso', 'Status postado!');
      fetchData(currentUser.id);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Falha ao postar status');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.statusItem} 
      onPress={() => {
        setSelectedStatus(item);
        setShowStatusModal(true);
        registerStatusView(item.id);
        if (currentUser?.id === item.user_id) {
          fetchStatusViewers(item.id);
        }
      }}
    >
      <View style={[styles.statusRing, { borderColor: COLORS.primary }]}>
        {item.profile_pic ? (
          <Image source={{ uri: item.profile_pic }} style={styles.statusAvatar} />
        ) : (
          <View style={[styles.statusAvatar, styles.placeholderAvatarSmall]}>
            <Ionicons name="person" size={20} color={COLORS.textMuted} />
          </View>
        )}
      </View>
      <Text style={styles.statusName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );

  const OnlineUserItem = ({ item }: { item: any }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    return (
      <TouchableOpacity 
        style={styles.onlineItem} 
        onPress={() => {
          setSelectedProfileUser(item);
          setShowProfileModal(true);
        }}
        onLongPress={() => router.push({
          pathname: `/chat/${item.id}` as any,
          params: { contactName: item.name, contactUser: item.username, contactPic: item.profile_pic }
        })}
      >
        <View style={styles.onlineAvatarWrapper}>
          {item.profile_pic ? (
            <Image source={{ uri: item.profile_pic }} style={styles.onlineAvatar} />
          ) : (
            <View style={[styles.onlineAvatar, styles.placeholderAvatarSmall]}>
              <Ionicons name="person" size={18} color={COLORS.textMuted} />
            </View>
          )}
          <Animated.View style={[styles.onlineDot, { transform: [{ scale: pulseAnim }] }]} />
        </View>
        <Text style={styles.onlineName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: any) => (
    <TouchableOpacity style={styles.chatCard} onPress={() => openChat(item)}>
      <View style={styles.avatarContainer}>
        {item.profile_pic ? (
          <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Ionicons name="person" size={24} color={COLORS.textMuted} />
          </View>
        )}
        {/* BADGE DE NÃO LIDAS */}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCountText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.time}>
            {item.last_message_time ? new Date(item.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.media_type !== 'text' ? `📷 ${item.media_type}` : item.content_text || 'Sem mensagens'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Customizado */}
        <View style={styles.customHeader}>
            <View>
                <Text style={styles.brandText}>NextGen</Text>
                <Text style={styles.headerTitle}>Conversas</Text>
            </View>
            <TouchableOpacity onPress={() => fetchData(currentUser?.id)}>
                <Ionicons name="reload" size={24} color={COLORS.primary} />
            </TouchableOpacity>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
                refreshing={loading} 
                onRefresh={() => {
                    if (currentUser?.id) {
                        loadInfo(); // Força recarga total
                        fetchData(currentUser.id);
                    }
                }} 
                tintColor={COLORS.primary} 
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSections}>
              {/* Meus Status */}
              <View style={styles.statusContainer}>
                <Text style={styles.sectionHeader}>Status Temporários</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusList}>
                  <TouchableOpacity style={styles.statusItem} onPress={pickStatusMedia}>
                    <View style={styles.myStatusWrapper}>
                        {currentUser?.profile_pic ? (
                          <Image source={{ uri: currentUser.profile_pic }} style={styles.statusAvatar} />
                        ) : (
                          <View style={[styles.statusAvatar, styles.placeholderAvatarSmall]}>
                            <Ionicons name="person" size={22} color={COLORS.textMuted} />
                          </View>
                        )}
                        <View style={styles.plusIcon}>
                          <Ionicons name="add" size={14} color="#FFF" />
                        </View>
                    </View>
                    <Text style={styles.statusName}>Meu Status</Text>
                  </TouchableOpacity>
                  <FlatList
                    horizontal
                    data={statuses}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderStatusItem}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>

              {/* Online Agora - Abaixo dos Status */}
              <View style={styles.onlineContainer}>
                <Text style={styles.sectionHeader}>Online Agora</Text>
                {onlineUsers.length > 0 ? (
                    <FlatList
                    horizontal
                    data={onlineUsers}
                    keyExtractor={(item: any) => 'online-' + item.id.toString()}
                    renderItem={({ item }) => <OnlineUserItem item={item} />}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 15 }}
                    />
                ) : (
                    <Text style={styles.emptyOnline}>Ninguém online no momento.</Text>
                )}
              </View>
              
              <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Mensagens Recentes</Text>

              {/* Card fixado da Ayla IA */}
              <TouchableOpacity
                style={styles.aylaChatCard}
                onPress={() => router.push('/chat/ayla' as any)}
                activeOpacity={0.85}
              >
                <View style={styles.aylaCardGradientBg}>
                  <View style={styles.aylaAvatarRing}>
                    <LinearGradient
                      colors={['#a855f7', '#6366f1', '#00D084']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.aylaAvatarGrad}
                    >
                      <Text style={styles.aylaAvatarEmoji}>✨</Text>
                    </LinearGradient>
                    <View style={styles.aylaDot} />
                  </View>
                  <View style={styles.aylaChatInfo}>
                    <View style={styles.aylaChatRow}>
                      <View style={styles.aylaTitleRow}>
                        <Text style={styles.aylaChatName}>Ayla IA</Text>
                        <View style={styles.aylaBadge}>
                          <Text style={styles.aylaBadgeText}>IA</Text>
                        </View>
                      </View>
                      <Text style={styles.aylaPinned}>📌 Fixado</Text>
                    </View>
                    <Text style={styles.aylaChatSub} numberOfLines={1}>
                      Sua assistente inteligente · Toque para conversar
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>Inicie uma conversa clicando no botão abaixo.</Text>
            </View>
          }
        />

        <TouchableOpacity style={[styles.fab, SHADOWS.primary]} onPress={() => router.push('/(tabs)/contacts' as any)}>
            <Ionicons name="add" size={32} color={COLORS.background} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Visualizador de Status */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalBg} {...panResponder.panHandlers}>
          {/* Áreas de Toque Laterais */}
          <View style={styles.statusTouchOverlay}>
            <TouchableOpacity 
              style={styles.touchSide} 
              onPress={handlePrevStatus} 
              activeOpacity={1}
            />
            <TouchableOpacity 
              style={styles.touchSide} 
              onPress={handleNextStatus} 
              activeOpacity={1}
            />
          </View>

          <TouchableOpacity style={styles.closeStatus} onPress={() => setShowStatusModal(false)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {selectedStatus && (
            <View style={styles.statusContent}>
              <View style={styles.statusHeader}>
                  <Image source={{ uri: selectedStatus.profile_pic }} style={styles.miniAvatar} />
                  <Text style={styles.statusUserTitle}>{selectedStatus.name}</Text>
              </View>
              <Image source={{ uri: selectedStatus.media_url }} style={styles.fullStatusImage} resizeMode="contain" />
              
              {/* Barra de Reações (Apenas se não for meu) */}
              {currentUser?.id !== selectedStatus.user_id && (
                <View style={styles.reactionsBar}>
                  {['❤️', '😂', '😮', '🔥', '👍'].map(emoji => (
                    <TouchableOpacity key={emoji} onPress={() => reactToStatus(selectedStatus.id, emoji)}>
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Botão de Visualizadores (Apenas se for MEU status) */}
              {currentUser?.id === selectedStatus.user_id && (
                <TouchableOpacity 
                  style={styles.viewersBtn} 
                  onPress={() => setShowViewersModal(true)}
                >
                  <Ionicons name="eye-outline" size={20} color="#FFF" />
                  <Text style={styles.viewersCount}>{statusViewers.length} visualizações</Text>
                </TouchableOpacity>
              )}

              {selectedStatus.content_text ? (
                <View style={styles.statusCaptionBg}>
                   <Text style={styles.statusCaption}>{selectedStatus.content_text}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Modal>

      {/* Modal de Visualizadores do Status */}
      <Modal visible={showViewersModal} transparent animationType="slide">
        <View style={styles.viewersModalContainer}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.viewersHeader}>
            <Text style={styles.viewersTitle}>Visto por</Text>
            <TouchableOpacity onPress={() => setShowViewersModal(false)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={statusViewers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.viewerItem}>
                <Image source={{ uri: item.profile_pic }} style={styles.viewerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.viewerName}>{item.name}</Text>
                  <Text style={styles.viewerTime}>
                    {new Date(item.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {item.reaction && <Text style={styles.viewerReaction}>{item.reaction}</Text>}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyViewers}>Ninguém visualizou ainda.</Text>
            }
          />
        </View>
      </Modal>

      {/* Perfil Público Premium */}
      <ProfileModal 
        visible={showProfileModal}
        user={selectedProfileUser}
        onClose={() => setShowProfileModal(false)}
        onStartChat={(user) => openChat(user)}
      />
    </View>
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
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.15,
  },
  blob1: { backgroundColor: COLORS.primary, top: -100, left: -100 },
  blob2: { backgroundColor: '#6366f1', bottom: -100, right: -100 },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  brandText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
  },
  headerSections: {
    paddingBottom: 10,
  },
  statusContainer: {
    paddingVertical: 10,
  },
  sectionHeader: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 12,
    letterSpacing: 1,
  },
  onlineContainer: {
    paddingVertical: 15,
    marginTop: 5,
  },
  onlineItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  onlineAvatarWrapper: {
    position: 'relative',
  },
  onlineAvatar: {
    width: 54,
    height: 54,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00D084',
    borderWidth: 2,
    borderColor: '#050510',
  },
  onlineName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyOnline: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginLeft: 20,
    fontStyle: 'italic',
  },
  statusList: {
    paddingLeft: 20,
  },
  statusItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 75,
  },
  statusRing: {
    width: 70,
    height: 70,
    borderRadius: 25,
    borderWidth: 2.5,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  myStatusWrapper: {
    width: 70,
    height: 70,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  plusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#050510',
  },
  statusName: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholderAvatarSmall: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 150,
  },
  chatCard: {
    flexDirection: 'row',
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
  },
  placeholderAvatar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  lastMsg: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    marginTop: 50,
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeStatus: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  statusContent: {
    flex: 1,
  },
  statusHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  statusUserTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullStatusImage: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  statusCaptionBg: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  statusCaption: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30,
    marginHorizontal: 40,
    marginTop: 10,
    zIndex: 100,
  },
  reactionEmoji: {
    fontSize: 28,
    marginHorizontal: 10,
  },
  viewersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
    zIndex: 100,
  },
  viewersCount: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  viewersModalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  viewersTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 15,
    marginRight: 15,
  },
  viewerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  viewerReaction: {
    fontSize: 22,
  },
  emptyViewers: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#050510',
  },
  unreadCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  touchSide: {
    flex: 1,
    height: '100%',
  },
  // === AYLA IA CARD ===
  aylaChatCard: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  aylaCardGradientBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  aylaAvatarRing: {
    position: 'relative',
    marginRight: 14,
  },
  aylaAvatarGrad: {
    width: 55,
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aylaAvatarEmoji: {
    fontSize: 26,
  },
  aylaDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#a855f7',
    borderWidth: 2,
    borderColor: '#050510',
  },
  aylaChatInfo: {
    flex: 1,
  },
  aylaChatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aylaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aylaChatName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  aylaBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aylaBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aylaPinned: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
  },
  aylaChatSub: {
    color: 'rgba(168, 85, 247, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});
