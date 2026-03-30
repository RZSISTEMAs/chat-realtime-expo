import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { API_BASE, API_URL } from '../../constants/api';
import { prepareFormData } from '../../constants/media';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function AuroraBackground() {
  return (
    <View style={styles.auroraContainer}>
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
    </View>
  );
}

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profileBackground, setProfileBackground] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  // AUTO-SAVE BIO LOGIC
  useEffect(() => {
    if (user && description !== user.description) {
      const delayDebounceFn = setTimeout(() => {
        autoSaveBio();
      }, 1000); 

      return () => clearTimeout(delayDebounceFn);
    }
  }, [description]);

  const loadUser = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      setName(u.name);
      setPassword(u.password || '');
      setProfilePic(u.profile_pic);
      setProfileBackground(u.profile_background);
      setDescription(u.description || '');
    }
  };

  const pickImage = async (type: 'profile' | 'background') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Substituído MediaTypeOptions.Images (depreciado)
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].uri) {
      uploadImage(result.assets[0].uri, type);
    }
  };

  const uploadImage = async (uri: string, type: 'profile' | 'background') => {
    try {
      setLoading(true);
      const formData = await prepareFormData(uri, 'media');
      
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fullUrl = `${API_URL}${res.data.media_url}`;
      
      const updateData: any = { userId: user.id };
      if (type === 'profile') {
        setProfilePic(fullUrl);
        updateData.profile_pic = fullUrl;
      } else {
        setProfileBackground(fullUrl);
        updateData.profile_background = fullUrl;
      }
      
      // Salva imagem imediatamente no banco
      await axios.post(`${API_BASE}/users/update`, updateData);
      const updatedUser = { ...user, ...updateData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert('Sucesso', 'Imagem atualizada com sucesso!');
    } catch (err) {
      console.error('Erro no upload:', err);
      Alert.alert('Erro', 'Falha ao subir imagem.');
    } finally {
      setLoading(false);
    }
  };

  const autoSaveBio = async () => {
    if (!user) return;
    try {
      setIsSavingBio(true);
      const response = await axios.post(`${API_BASE}/users/update`, {
        userId: user.id,
        description: description,
      });

      if (response.data.success) {
        // O servidor retorna { success, id, name, profile_pic, ... }
        // Fazemos merge com o usuário atual para não perder dados locais
        const { success, ...serverFields } = response.data;
        const mergedUser = { ...user, ...serverFields };
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
        setUser(mergedUser);
        console.log('[AutoSave] Perfil sincronizado totalmente.');
      }
    } catch (err) {
      console.error('[AutoSave] Erro ao sincronizar bio:', err);
    } finally {
      setTimeout(() => setIsSavingBio(false), 800);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  const SettingFolder = ({ icon, title, subtitle, onPress }: any) => (
    <TouchableOpacity style={styles.folderItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.folderIconBg}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.folderContent}>
        <Text style={styles.folderTitle}>{title}</Text>
        <Text style={styles.folderSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );

  if (!user) return null;

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.webCenter}>
            {/* TOPO: PERFIL PREMIUM (CAPA + AVATAR) */}
            <View style={styles.header}>
              <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.backgroundWrapper} 
                onPress={() => pickImage('background')}
              >
                {profileBackground ? (
                  <Image source={{ uri: profileBackground }} style={styles.backgroundImage} />
                ) : (
                  <View style={styles.placeholderBackground}>
                    <Ionicons name="sparkles" size={40} color="rgba(99, 102, 241, 0.3)" />
                  </View>
                )}
                <LinearGradient 
                  colors={['transparent', 'rgba(5, 5, 16, 0.8)']} 
                  style={styles.backgroundOverlay} 
                />
              </TouchableOpacity>

              <View style={styles.profileInfoWrapper}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.avatarWrapper, SHADOWS.primary]} 
                  onPress={() => pickImage('profile')}
                >
                  <View style={styles.avatarGlow} />
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <Ionicons name="person" size={40} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={14} color="#000" />
                  </View>
                </TouchableOpacity>
                
                <View style={styles.userTextContainer}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.badgeContainer}>
                    <View style={[styles.verifiedBadge, !user.is_verified && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Ionicons 
                        name={user.is_verified ? "shield-checkmark" : "shield-outline"} 
                        size={12} 
                        color={user.is_verified ? "#000" : "rgba(255,255,255,0.4)"} 
                      />
                      <Text style={[styles.verifiedText, !user.is_verified && { color: 'rgba(255,255,255,0.4)' }]}>
                        {user.is_verified ? 'VERIFICADO' : 'NÃO VERIFICADO'}
                      </Text>
                    </View>
                    {user.age && (
                      <View style={styles.ageBadge}>
                        <Text style={styles.ageText}>{user.age} ANOS</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* CENTRO: STATUS / BIO (AUTO-SAVE) */}
            <View style={styles.statusCard}>
              <View style={styles.cardBlur}>
                <View style={styles.statusHeaderRow}>
                  <Text style={styles.sectionTitle}>STATUS E BIO</Text>
                  {isSavingBio && <Text style={styles.savingText}>SINCRONIZANDO...</Text>}
                </View>
                <View style={styles.bioContainer}>
                  <TextInput
                    style={styles.bioInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Defina seu status..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    maxLength={100}
                    multiline
                  />
                  <Ionicons name="pencil-sharp" size={16} color="rgba(255,255,255,0.1)" style={styles.editIcon} />
                </View>
              </View>
            </View>

            {/* BASE: SUBPASTAS DE CONFIGURAÇÕES */}
            <View style={styles.menuSection}>
              <Text style={styles.menuLabel}>CONFIGURAÇÕES DO SISTEMA</Text>
              
              <View style={styles.folderGroup}>
                <SettingFolder 
                   icon="medal-outline" 
                   title="Minhas Insígnias" 
                   subtitle="Status de verificação e conquistas" 
                   onPress={() => router.push('/my-badges' as any)}
                />
                <SettingFolder 
                  icon="person-outline" 
                   title="Minha Conta" 
                  subtitle="Privacidade, Segurança, Mudar PIN" 
                  onPress={() => {}}
                />
                <SettingFolder 
                   icon="chatbubbles-outline" 
                   title="Conversas" 
                   subtitle="Papéis de parede, Histórico, Backup" 
                   onPress={() => {}}
                />
                <SettingFolder 
                   icon="notifications-outline" 
                   title="Notificações" 
                   subtitle="Sons de alerta, Mensagens em grupo" 
                   onPress={() => {}}
                />
                <SettingFolder 
                   icon="shield-checkmark-outline" 
                   title="Verificação" 
                   subtitle="Status do selo de autenticidade" 
                   onPress={() => user.is_verified ? Alert.alert('Verificado', 'Seu selo está ativo.') : router.push('/face-scan' as any)}
                />
              </View>

              <View style={styles.folderGroup}>
                 <SettingFolder 
                   icon="help-circle-outline" 
                   title="Ajuda e Suporte" 
                   subtitle="Central de ajuda, Fale conosco" 
                   onPress={() => router.push('/help-support' as any)}
                />
                <SettingFolder 
                   icon="information-circle-outline" 
                   title="Sobre o App" 
                   subtitle="Versão 2.4.0 (Build 503)" 
                   onPress={() => {}}
                />
              </View>

              <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                <View style={styles.logoutIconBg}>
                  <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
                </View>
                <Text style={styles.logoutLabel}>Encerrar Sessão no Dispositivo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  webCenter: {
    flex: 1,
    alignSelf: Platform.OS === 'web' ? 'center' : 'auto',
    width: Platform.OS === 'web' ? 500 : '100%',
    paddingBottom: 120,
  },
  header: {
    paddingBottom: 10,
  },
  backgroundWrapper: {
    width: '100%',
    height: 200,
    backgroundColor: '#0A0A1F',
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 25,
    marginTop: -50,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 35,
    backgroundColor: '#050510',
    padding: 4,
    position: 'relative',
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    opacity: 0.2,
    transform: [{ scale: 1.1 }],
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  placeholderAvatar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#050510',
  },
  userTextContainer: {
    marginLeft: 18,
    paddingBottom: 4,
  },
  userName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  verifiedText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 3,
  },
  ageBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ageText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '800',
  },
  statusCard: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  cardBlur: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  savingText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bioInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    padding: 0,
    minHeight: 44,
  },
  editIcon: {
    marginTop: 4,
    marginLeft: 10,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  menuLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 10,
    marginBottom: 15,
  },
  folderGroup: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  folderIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  folderContent: {
    flex: 1,
  },
  folderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  folderSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.05)',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.1)',
    marginTop: 10,
  },
  logoutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoutLabel: {
    color: '#FF4D4D',
    fontSize: 15,
    fontWeight: '700',
  },
});
