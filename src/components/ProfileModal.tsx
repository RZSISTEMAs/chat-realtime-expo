import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Dimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  id: number;
  name: string;
  username: string;
  profile_pic?: string | null;
  profile_background?: string | null;
  description?: string | null;
  age?: number | null;
  is_verified?: boolean | number;
  is_online?: boolean;
}

interface ProfileModalProps {
  visible: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onStartChat?: (user: UserProfile) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, user, onClose, onStartChat }) => {
  if (!user) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={styles.modalView}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050510' }]} />
          )}

          {/* Botão Fechar */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Foto de Capa */}
          <View style={styles.coverContainer}>
            {user.profile_background ? (
              <Image 
                key={user.profile_background}
                source={{ uri: user.profile_background }} 
                style={styles.coverImage} 
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Ionicons name="sparkles" size={40} color="rgba(99, 102, 241, 0.2)" />
              </View>
            )}
            <View style={styles.coverOverlay} />
          </View>

          {/* Conteúdo do Perfil */}
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              {user.profile_pic ? (
                <Image source={{ uri: user.profile_pic }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Ionicons name="person" size={50} color="rgba(255,255,255,0.2)" />
                </View>
              )}
              {user.is_online && <View style={styles.onlineBadge} />}
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.name}</Text>
                {user.age && (
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageText}>{user.age}</Text>
                  </View>
                )}
                {!!user.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#000" />
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{user.username}</Text>
            </View>

            <View style={styles.bioCard}>
              <Text style={styles.bioTitle}>SOBRE</Text>
              <Text style={styles.bioText}>
                {user.description || 'Este usuário ainda não definiu um status.'}
              </Text>
            </View>

            {onStartChat && (
              <TouchableOpacity 
                style={styles.chatButton} 
                onPress={() => {
                  onStartChat(user);
                  onClose();
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#000" style={{ marginRight: 10 }} />
                <Text style={styles.chatButtonText}>Enviar Mensagem</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '100%',
    height: height * 0.75,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#050510',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    width: '100%',
    height: 200,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    backgroundColor: '#0A0A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 16, 0.4)',
  },
  profileContent: {
    paddingHorizontal: 25,
    alignItems: 'center',
    marginTop: -60,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    padding: 4,
    backgroundColor: '#050510',
    position: 'relative',
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    opacity: 0.3,
    transform: [{ scale: 1.15 }],
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  placeholderAvatar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#050510',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 15,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    backgroundColor: '#6366f1',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  username: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  ageBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ageText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bioCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 25,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bioTitle: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  bioText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: '#6366f1',
    width: '100%',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  chatButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default ProfileModal;
