import { Stack, Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, useWindowDimensions, StyleSheet, LogBox } from 'react-native';
import { COLORS } from '../constants/theme';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';

// Silencia o aviso insistente do Expo Go sobre notificações no Android
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Configura como as notificações devem se comportar quando o app está aberto (Apenas Celular)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldVibrate: true,
      shouldSetBadge: false,
    }),
  });
}

export default function Layout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 1000;
  const pathname = usePathname();

  useEffect(() => {
    registerForNotifications();
  }, []);

  const registerForNotifications = async () => {
    if (Platform.OS === 'web') return;
    
    // NO ANDROID EXPO GO, as notificações remotas causam erro crítico.
    // Vamos apenas pedir permissão, mas ignorar o resto se for Expo Go.
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada!');
        return;
      }
    } catch (e) {
      console.log('Erro ao registrar notificações:', e);
    }
  };
  
  // Não mostrar sidebar na tela de login
  const isAuthScreen = pathname === '/' || pathname === '/index';

  if (isWeb && !isAuthScreen) {
    return (
      <View style={styles.webContainer}>
        <StatusBar style="light" />
        <View style={styles.webContent}>
           <View style={styles.mainArea}>
              <Slot />
           </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="chat/ayla" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0a0b1e', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContent: {
    width: '100%',
    maxWidth: 450, 
    height: '95%',
    maxHeight: 850,
    backgroundColor: '#000', 
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#646cff',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainArea: {
    flex: 1,
    backgroundColor: '#000',
  }
});
