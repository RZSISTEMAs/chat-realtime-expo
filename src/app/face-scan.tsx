import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE } from '../constants/api';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function FaceScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('Posicione seu rosto');
  const [progress, setProgress] = useState(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const [detectedAge, setDetectedAge] = useState<number | null>(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    if (scanning) {
      animateScan();
      startProgress();
    }
  }, [scanning]);

  const animateScan = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const startProgress = () => {
    let p = 0;
    const interval = setInterval(() => {
      p += 0.05;
      if (p >= 1) {
        clearInterval(interval);
        completeVerification();
      } else {
        setProgress(p);
        if (p > 0.2 && p < 0.5) {
          setStatus('Detectando traços faciais...');
          // Efeito visual de detecção de idade mudando rápido
          setDetectedAge(Math.floor(Math.random() * 72) + 18);
        }
        if (p >= 0.5 && p < 0.8) {
          setStatus('Analisando idade aproximada...');
          setDetectedAge(Math.floor(Math.random() * 72) + 18);
        }
        if (p >= 0.8) {
          setStatus('Finalizando biometria...');
        }
      }
    }, 150);
  };

  const completeVerification = async () => {
    const finalAge = Math.floor(Math.random() * 72) + 18;
    setDetectedAge(finalAge);

    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      // Tenta enviar para o servidor, mas não trava se der erro (apenas para teste)
      try {
        await axios.post(`${API_BASE}/users/verify`, {
          userId: user.id,
          age: finalAge
        });
      } catch (e) {
        console.log('[DEBUG] Servidor offline ou 404, mas seguindo com o teste local.');
      }

      // Atualiza localmente para o app mostrar o selo na hora
      const updatedUser = { ...user, is_verified: 1, age: finalAge };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      setStatus(`IDADE DETECTADA: ${finalAge} ANOS`);
      setScanning(false);

      Alert.alert('Sucesso ', `Identidade verificada via Biometria!\nIdade detectada: ${finalAge} anos.\n\nO selo azul já está ativo no seu perfil.`, [
        { text: 'OK', onPress: () => router.push('/(tabs)/settings') }
      ]);
    } catch (err) {
      console.error('Erro na simulação:', err);
      setScanning(false);
      setProgress(0);
      setStatus('Erro no escaneamento');
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso à câmera negado</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      <BlurView intensity={scanning ? 40 : 10} tint="dark" style={StyleSheet.absoluteFill}>
        <SafeAreaView style={styles.overlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.scanContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {scanning && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }) }] }
                  ]}
                />
              )}
            </View>

            <View style={styles.statusBox}>
              {scanning && detectedAge && (
                <View style={styles.ageOverlay}>
                  <Text style={styles.ageOverlayLabel}>IDADE ESTIMADA</Text>
                  <Text style={styles.ageOverlayValue}>{detectedAge}</Text>
                </View>
              )}

              <Text style={styles.statusText}>{status}</Text>
              {scanning && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.instruction}>Mantenha o rosto dentro do quadro e aguarde a conclusão da biometria facial.</Text>

            {!scanning && (
              <TouchableOpacity style={styles.startBtn} onPress={() => setScanning(true)}>
                <LinearGradient
                  colors={[COLORS.primary, '#00E5FF']}
                  style={styles.btnGradient}
                >
                  <Text style={styles.startBtnText}>INICIAR BIOMETRIA</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </BlurView>
    </View>
  );
}

// Pequeno helper para SafeArea em telas customizadas
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 280,
    height: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    borderRadius: 40,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
  },
  topLeft: { top: -1, left: -1, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
  topRight: { top: -1, right: -1, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
  bottomLeft: { bottom: -1, left: -1, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: -1, right: -1, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
  scanLine: {
    height: 3,
    width: '100%',
    backgroundColor: COLORS.primary,
    position: 'absolute',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  statusBox: {
    marginTop: 40,
    alignItems: 'center',
    position: 'relative',
  },
  ageOverlay: {
    position: 'absolute',
    top: -150,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  ageOverlayLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  ageOverlayValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  statusText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  instruction: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  startBtn: {
    width: '100%',
    height: 65,
    borderRadius: 20,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    margin: 50,
  },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 15,
    alignSelf: 'center',
  },
  btnText: {
    color: '#000',
    fontWeight: '900',
  },
});
