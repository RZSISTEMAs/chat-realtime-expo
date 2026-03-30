import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00D084',
  secondary: '#6366f1',
  background: '#050510',
  card: 'rgba(255, 255, 255, 0.03)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

const AuroraBackground = () => (
  <View style={styles.auroraContainer}>
    <View style={[styles.blob, styles.blob1]} />
    <View style={[styles.blob, styles.blob2]} />
  </View>
);

export default function MyBadgesScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const usrStr = await AsyncStorage.getItem('user');
    if (usrStr) setUser(JSON.parse(usrStr));
  };

  const BadgeCard = ({ icon, title, description, isActive, color }: any) => (
    <View style={[styles.badgeCard, !isActive && styles.inactiveCard]}>
      <LinearGradient
        colors={isActive ? [color + '20', 'transparent'] : ['transparent', 'transparent']}
        style={styles.cardGradient}
      >
        <View style={[styles.iconBox, { backgroundColor: isActive ? color + '15' : 'rgba(255,255,255,0.05)' }]}>
          <Ionicons name={icon} size={28} color={isActive ? color : 'rgba(255,255,255,0.2)'} />
        </View>
        <View style={styles.badgeInfo}>
          <Text style={[styles.badgeTitle, !isActive && { color: 'rgba(255,255,255,0.3)' }]}>{title}</Text>
          <Text style={styles.badgeDesc}>{description}</Text>
        </View>
        {isActive ? (
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>ATIVO</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/face-scan' as any)}>
            <Text style={styles.unlockText}>LIBERAR</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  if (!user) return null;

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MINHAS INSÍGNIAS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
                {user.profile_pic ? (
                    <Image source={{ uri: user.profile_pic }} style={styles.avatar} />
                ) : (
                    <View style={styles.placeholderAvatar}>
                        <Ionicons name="person" size={40} color="rgba(255,255,255,0.2)" />
                    </View>
                )}
                {user.is_verified && <View style={styles.verifiedDot}><Ionicons name="checkmark" size={10} color="#000" /></View>}
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userStatus}>Status de Usuário: {user.is_verified ? 'Verificado' : 'Pendente'}</Text>
          </View>

          <View style={styles.badgesContainer}>
            <BadgeCard 
              icon="shield-checkmark" 
              title="Selo de Autenticidade" 
              description="Confirmado via Face Scan. Garante que você é uma pessoa real."
              isActive={user.is_verified}
              color={COLORS.primary}
            />

            <BadgeCard 
              icon="calendar" 
              title="Idade Confirmada" 
              description={`Seu perfil exibe que você tem ${user.age} anos conforme validado.`}
              isActive={user.age}
              color="#6366f1"
            />

            <BadgeCard 
              icon="star" 
              title="Usuário Pioneiro" 
              description="Membro da primeira fase oficial do aplicativo NextGen."
              isActive={true}
              color="#FFD700"
            />

            <BadgeCard 
              icon="flash" 
              title="Perfil Premium" 
              description="Acesso a recursos exclusivos de personalização e aurora."
              isActive={false}
              color="#ff4d4d"
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              As insígnias ajudam a construir confiança na comunidade. Mantenha seu perfil verificado para ter maior alcance.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  auroraContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    opacity: 0.1,
  },
  blob1: { backgroundColor: COLORS.primary, top: -200, left: -200 },
  blob2: { backgroundColor: COLORS.secondary, bottom: -200, right: -200 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 35,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  placeholderAvatar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 15,
  },
  userStatus: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 5,
    fontWeight: '600',
  },
  badgesContainer: {
    gap: 15,
  },
  badgeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  badgeDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  unlockBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unlockText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 15,
    borderRadius: 20,
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
