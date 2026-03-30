import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(26, 28, 41, 0.95)',
          height: 110,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null
        ),
        headerTitleStyle: {
          fontSize: 22,
          fontWeight: '900',
          color: COLORS.primary,
          letterSpacing: 2,
        },
        headerTintColor: COLORS.text,
        tabBarBackground: () => (
           Platform.OS === 'ios' ? (
             <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
           ) : (
             <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26, 28, 41, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' } ]} />
           )
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 15,
          left: 15,
          right: 15,
          height: 65,
          borderRadius: 32,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(26, 28, 41, 0.95)',
          borderTopWidth: 0,
          paddingBottom: 0,
          elevation: 10,
          shadowColor: COLORS.primary,
          shadowOpacity: 0.3,
          shadowRadius: 15,
          overflow: 'hidden',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 5,
        }
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          headerShown: false,
          title: 'Conversas',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Buscar (@)',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Jogos',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
