import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { API_BASE } from '../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      router.replace('/(tabs)/chats');
    }
  };

  const handleAuth = async () => {
    if (!username || !password) return Alert.alert('Erro', 'Preencha usuário e senha');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await axios.post(`${API_BASE}/users/login`, { 
          username: username.replace('@', '').trim(),
          password 
        });
      } else {
        if (!name || !age) return Alert.alert('Erro', 'Preencha nome e idade');
        res = await axios.post(`${API_BASE}/users/register`, {
          name,
          username: username.replace('@', '').trim(),
          age: parseInt(age),
          password
        });
      }
      
      // O backend retorna { success: true, user: {...} }
      // Extraímos o objeto `user` correto, com fallback para compatibilidade
      const userData = res.data?.user ?? res.data;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      router.replace('/(tabs)/chats');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error || 'Não foi possível autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Aurora Effect */}
      <View style={styles.auroraContainer}>
          <View style={[styles.blob, styles.blob1]} />
          <View style={[styles.blob, styles.blob2]} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
               <Ionicons name="flash" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.logoText}>Messaging Next</Text>
            <Text style={styles.tagline}>A nova era da comunicação instantânea.</Text>
          </View>

          <View style={styles.cardContainer}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.03)' }]} />
            )}
            
            <View style={styles.card}>
                <Text style={styles.title}>{isLogin ? 'Bem-vindo' : 'Crie sua conta'}</Text>
                
                {!isLogin && (
                  <>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Nome Completo"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Idade"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                        keyboardType="numeric"
                        value={age}
                        onChangeText={setAge}
                      />
                    </View>
                  </>
                )}

                <View style={styles.inputWrapper}>
                  <Ionicons name="at-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="usuario"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Senha ou PIN"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.button, SHADOWS.primary, loading && { opacity: 0.7 }]} 
                  onPress={handleAuth}
                  disabled={loading}
                >
                  <LinearGradient 
                    colors={[COLORS.primary, '#00E5FF']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.buttonText}>{isLogin ? 'ENTRAR' : 'COMEÇAR'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switch}>
                  <Text style={styles.switchText}>
                    {isLogin ? 'Não tem uma conta? ' : 'Já possui uma conta? '}
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                      {isLogin ? 'Cadastre-se' : 'Entre aqui'}
                    </Text>
                  </Text>
                </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    overflow: 'hidden',
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.2,
  },
  blob1: {
    backgroundColor: COLORS.primary,
    top: -100,
    left: -100,
  },
  blob2: {
    backgroundColor: '#6366f1',
    bottom: -100,
    right: -100,
  },
  scroll: {
    flexGrow: 1,
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 132, 0.3)',
    marginBottom: 15,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    ...Platform.select({
      web: { textShadow: '0 0 15px rgba(0, 208, 132, 0.5)' },
      default: {
        textShadowColor: 'rgba(0, 208, 132, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
      }
    })
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  card: {
    padding: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: '#FFF',
    fontSize: 16,
  },
  button: {
    marginTop: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  switch: {
    marginTop: 25,
    alignItems: 'center',
  },
  switchText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
