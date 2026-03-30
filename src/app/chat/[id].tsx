import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, Dimensions, Animated, ActivityIndicator, Modal, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { API_URL, API_BASE } from '../../constants/api';
import { prepareFormData } from '../../constants/media';
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

export default function ChatScreen() {
  const { id: contactId, contactName, contactPic } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    navigation.setOptions({ 
      headerShown: false, // Desativar header automático para usar o nosso customizado
    });
    initChat();
  }, [contactId]);

  const initChat = async () => {
    const usrStr = await AsyncStorage.getItem('user');
    if (!usrStr) return;
    const usr = JSON.parse(usrStr);
    setCurrentUser(usr);

    try {
      const res = await axios.get(`${API_BASE}/messages/${usr.id}/${contactId}`);
      setMessages(res.data);

      const newSocket = io(API_URL);
      newSocket.emit('join', usr.id);
      newSocket.on('receive_message', async (msg: any) => {
        if (msg.sender_id == contactId && msg.receiver_id == usr.id) {
           setMessages(prev => [...prev, msg]);
           markAsRead(usr.id, contactId); // Marca como lido se estiver na tela

           // Vibrate and Play Sound (apenas em dispositivos móveis)
           if (Platform.OS !== 'web') {
             Vibration.vibrate([0, 100]);
             try {
               const { sound } = await Audio.Sound.createAsync(
                 { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' }
               );
               await sound.playAsync();
             } catch (err) { console.log('Sound error', err); }
           }

        } else if (msg.sender_id == usr.id && msg.receiver_id == contactId) {
           setMessages(prev => [...prev, msg]);
        } else if (msg.sender_id != usr.id) {
           // Mensagem de OUTRA pessoa enquanto estou neste chat
           if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
           
           // Mostrar Notificação completa (Apenas se NÃO estiver na Web)
           if (Platform.OS !== 'web') {
             await Notifications.scheduleNotificationAsync({
               content: {
                 title: `Nova mensagem de ${msg.sender_name || 'Alguém'}`,
                 body: msg.media_type === 'text' ? msg.content_text : '📷 Foto recebida',
                 sound: true,
               },
               trigger: null,
             });
           }
        }
      });
      setSocket(newSocket);
      
      // Marca como lido ao entrar
      markAsRead(usr.id, contactId);

      return () => newSocket.disconnect();
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (userId: any, contactId: any) => {
    try {
      await axios.post(`${API_BASE}/messages/mark-read`, { userId, contactId });
    } catch (err) {
      console.error('Erro ao marcar como lido:', err);
    }
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video', ext: string) => {
    try {
        setUploading(true);
        const formData = await prepareFormData(uri, 'media');
        
        const res = await axios.post(`${API_URL}/api/upload`, formData, { 
            headers: { 'Content-Type': 'multipart/form-data' } 
        });
        return res.data.media_url; 
    } catch (err: any) {
        console.error('Erro no upload de mídia:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido';
        Alert.alert('Erro no Upload', `Falha ao subir imagem: ${errorMsg}. Verifique a conexão com o servidor.`);
        return null;
    } finally {
        setUploading(false);
    }
  };

  const sendMessage = async (text: string, media_url: string = '', media_type: string = 'text') => {
    if (!text && !media_url) return;
    if (!socket) return;
    socket.emit('send_message', { 
        sender_id: currentUser.id, 
        receiver_id: contactId, 
        content_text: text, 
        media_url, 
        media_type 
    });
    setInputText('');
  };

  const openContactProfile = async () => {
    try {
      // Busca dados frescos do usuário para o modal
      const res = await axios.get(`${API_BASE}/users`);
      const fullUser = res.data.find((u: any) => u.id == contactId);
      if (fullUser) {
        setSelectedProfileUser(fullUser);
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const url = await uploadMedia(uri, 'image', ext);
      if (url) {
        sendMessage('', url, 'image');
      }
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.sender_id == currentUser?.id;
    return (
      <View style={[styles.bubbleWrapper, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.media_type === 'text' && <Text style={[styles.msgText, isMe && { color: COLORS.background }]}>{item.content_text}</Text>}
          
          {item.media_type === 'image' && (
             <TouchableOpacity onPress={() => setSelectedImage(`${API_URL}${item.media_url}`)}>
               <Image 
                  source={{ uri: `${API_URL}${item.media_url}` }} 
                  style={styles.messageImage} 
                  resizeMode="cover"
               />
             </TouchableOpacity>
          )}

          {item.media_type === 'video' && (
            <View style={styles.mediaContainer}>
              <Ionicons name="videocam" size={20} color={isMe ? COLORS.background : COLORS.primary} />
              <Text style={[styles.mediaText, isMe && { color: COLORS.background }]}>Vídeo</Text>
            </View>
          )}
          <Text style={[styles.timeText, isMe && { color: 'rgba(13, 14, 21, 0.5)' }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AuroraBackground />
      
      {/* Cabeçalho Customizado (Premium) */}
      <View style={styles.customHeader}>
        {Platform.OS === 'ios' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/chats')} 
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} onPress={openContactProfile}>
          {contactPic ? (
            <Image source={{ uri: contactPic as string }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={14} color="#FFF" />
            </View>
          )}
          <View>
            <Text style={styles.headerText} numberOfLines={1}>{contactName || 'Chat'}</Text>
            <Text style={styles.onlineStatus}>Toque para ver o perfil</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIcon}>
           <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
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
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={[styles.listContainer, { paddingTop: 110 }]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputArea}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26, 28, 41, 0.95)' }]} />
            )}
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={26} color={COLORS.primary} />
              </TouchableOpacity>

              <TextInput 
                style={styles.input} 
                placeholder="Mensagem..." 
                placeholderTextColor={COLORS.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              {uploading ? (
                 <ActivityIndicator color={COLORS.primary} size="small" style={{ marginHorizontal: 10 }} />
              ) : (
                <TouchableOpacity 
                    style={styles.sendBtn} 
                    onPress={() => sendMessage(inputText)}
                    disabled={inputText.length === 0 && !uploading}
                >
                    <Ionicons 
                        name="send" 
                        size={24} 
                        color={(inputText.length > 0) ? COLORS.primary : COLORS.textMuted} 
                    />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal de Imagem em Tela Cheia */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalFullContainer}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableOpacity 
            style={styles.closeFullBtn} 
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>

          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

      {/* Perfil Público Premium */}
      <ProfileModal 
        visible={showProfileModal}
        user={selectedProfileUser}
        onClose={() => setShowProfileModal(false)}
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
  customHeader: {
    height: 100,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    backgroundColor: 'rgba(26, 28, 41, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatus: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerIcon: {
    padding: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  bubbleWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  bubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  msgText: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 22,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 15,
    marginVertical: 5,
  },
  mediaContainer: { flexDirection: 'row', alignItems: 'center' },
  mediaText: { color: COLORS.primary, marginLeft: 8, fontSize: 14, fontWeight: '600' },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: '#FFF',
    maxHeight: 120,
    marginHorizontal: 10,
    fontSize: 16,
  },
  iconBtn: { padding: 5 },
  sendBtn: { padding: 5 },
  modalFullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  closeFullBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  }
});
