import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { API_BASE, API_URL } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import ProfileModal from '../../components/ProfileModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
    </View>
  );
}

export default function ContactsScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initContacts();
  }, []);

  const socketRef = React.useRef<any>(null);

  const initContacts = async () => {
    try {
      const usrStr = await AsyncStorage.getItem('user');
      if (!usrStr) {
        router.replace('/' as any);
        return;
      }
      const usr = JSON.parse(usrStr);
      setCurrentUser(usr);

      // Carregar todos os usuários
      const res = await axios.get(`${API_BASE}/users`);
      const filtered = res.data.filter((u: any) => u.id !== usr.id); // Remover a si mesmo
      setAllUsers(filtered);
      setResults(filtered);

      // Socket para status online
      const socket = io(API_URL);
      socketRef.current = socket; // Guarda referência para cleanup
      socket.emit('join', usr.id);
      socket.on('update_online_users', (users: any[]) => {
        setOnlineUsers(users.map(u => u.id));
      });

      socket.on('user_updated', (updatedUser: any) => {
        if (!updatedUser || !updatedUser.id) return;

        console.log('[Socket] Contato atualizado:', updatedUser.username);
        
        // Atualizar usuário na lista de todos os usuários (Merge inteligente)
        setAllUsers(prev => prev.map(c => {
          if (c.id === updatedUser.id) {
            return {
              ...c,
              ...updatedUser,
              profile_pic: updatedUser.profile_pic || c.profile_pic,
              name: updatedUser.name || c.name,
            };
          }
          return c;
        }));

        // Atualizar resultados da busca atual
        setResults(prev => prev.map(c => {
          if (c.id === updatedUser.id) {
            return {
              ...c,
              ...updatedUser,
              profile_pic: updatedUser.profile_pic || c.profile_pic,
              name: updatedUser.name || c.name,
            };
          }
          return c;
        }));
        
        // Se o perfil desse usuário estiver aberto no modal, atualiza ele também
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup do socket ao sair da tela
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setResults(allUsers);
      return;
    }
    const filtered = allUsers.filter(u => 
      u.name.toLowerCase().includes(text.toLowerCase()) || 
      u.username.toLowerCase().includes(text.toLowerCase())
    );
    setResults(filtered);
  };

  const openChat = (contact: any) => {
    router.push({
      pathname: `/chat/${contact.id}`,
      params: { contactName: contact.name, contactUser: contact.username, contactPic: contact.profile_pic }
    } as any);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => {
        setSelectedProfileUser(item);
        setShowProfileModal(true);
      }}
    >
      <View style={styles.avatarContainer}>
        {item.profile_pic ? (
          <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Ionicons name="person" size={24} color={COLORS.textMuted} />
          </View>
        )}
        {onlineUsers.includes(item.id) && <View style={styles.onlineBadge} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <View style={styles.actionBtn}>
         <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.webCenter}>
          <View style={styles.header}>
             <Text style={styles.headerTitle}>Contatos</Text>
             <Text style={styles.headerSub}>Encontre novas pessoas para conversar</Text>
          </View>

          <View style={styles.searchBox}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
            )}
            <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              placeholder="Nome ou @usuário..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={searchText}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {loading && <ActivityIndicator color={COLORS.primary} style={styles.loader} />}
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              results.length > 0 ? (
                <Text style={styles.listCount}>{results.length} contatos encontrados</Text>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={80} color="rgba(255,255,255,0.05)" />
                  <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                </View>
              ) : (
                <View style={{ marginTop: 50 }}>
                   <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              )
            }
          />
        </View>
      </SafeAreaView>

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
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.15,
  },
  blob1: { backgroundColor: COLORS.primary, top: -100, left: -100 },
  blob2: { backgroundColor: '#6366f1', bottom: -100, right: -100 },
  webCenter: {
    flex: 1,
    alignSelf: Platform.OS === 'web' ? 'center' : 'auto',
    width: Platform.OS === 'web' ? 600 : '100%',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
  },
  headerSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 55,
    color: '#FFF',
    fontSize: 16,
  },
  loader: {
    marginLeft: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 20,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#050510',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  username: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,208,132,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  listCount: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
