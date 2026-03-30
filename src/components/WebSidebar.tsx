import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { API_BASE, API_URL } from '../constants/api';
import io from 'socket.io-client';

export default function WebSidebar() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id: activeChatId } = useLocalSearchParams();

  useEffect(() => {
    loadInfo();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      const socket = io(API_URL);
      socket.emit('join', currentUser.id);
      socket.on('receive_message', () => {
        fetchData(currentUser.id);
      });
      return () => { socket.disconnect(); };
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
    try {
      const res = await axios.get(`${API_BASE}/chats/history/${userId}`);
      setChats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderChatItem = ({ item }: { item: any }) => {
    const isActive = activeChatId === item.id.toString();
    return (
      <TouchableOpacity 
        style={[styles.chatCard, isActive && styles.activeCard]} 
        onPress={() => router.push({
          pathname: `/chat/${item.id}` as any,
          params: { contactName: item.name, contactUser: item.username, contactPic: item.profile_pic }
        })}
      >
        <Image 
          source={item.profile_pic ? { uri: item.profile_pic } : require('../../assets/images/icon.png')} 
          style={styles.avatar} 
        />
        <View style={styles.chatInfo}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.time}>
              {item.last_message_time ? new Date(item.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.media_type !== 'text' ? `📷 ${item.media_type}` : item.content_text}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/contacts')}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma conversa</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 350,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: '100%',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    paddingVertical: 10,
  },
  chatCard: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  activeCard: {
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  name: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  lastMsg: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
  }
});
