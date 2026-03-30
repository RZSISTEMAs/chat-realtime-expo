import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function HelpSupportScreen() {
  const router = useRouter();

  const LawSection = ({ icon, title, children, isGolden }: any) => (
    <View style={[styles.lawCard, isGolden && styles.goldenCard]}>
      <View style={styles.lawHeader}>
        <View style={[styles.iconContainer, isGolden && { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
          <Ionicons name={icon} size={24} color={isGolden ? '#FFD700' : COLORS.primary} />
        </View>
        <Text style={[styles.lawTitle, isGolden && { color: '#FFD700' }]}>{title}</Text>
      </View>
      <View style={styles.lawContent}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DIRETRIZES E SUPORTE</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.primary} style={{ marginBottom: 15 }} />
            <Text style={styles.introTitle}>Compromisso com a Segurança</Text>
            <Text style={styles.introSub}>
              Estamos em total conformidade com as novas regulamentações digitais para garantir um ambiente saudável e protegido para todos os nossos usuários.
            </Text>
          </View>

          {/* SEÇÃO ESPECIAL: LEI DO FELCA */}
          <LawSection icon="shield-half-sharp" title="LEI Nº 15.211/2025 (LEI DO FELCA)" isGolden>
            <Text style={styles.lawText}>
              <Text style={styles.bold}>Artigo 1º:</Text> Nosso aplicativo utiliza o sistema de <Text style={styles.highlight}>Face Scan (Escaneamento Facial)</Text> para verificação obrigatória de idade, combatendo a adultização infantil e garantindo a autenticidade dos perfis.
            </Text>
            <View style={styles.divider} />
            <Text style={styles.lawText}>
              <Text style={styles.bold}>Artigo 2º:</Text> É terminantemente proibida a publicidade direcionada a menores de 18 anos baseada em dados comportamentais.
            </Text>
            <View style={styles.divider} />
            <Text style={styles.lawText}>
              <Text style={styles.bold}>Artigo 3º:</Text> Todas os perfis verificados recebem uma insígnia de segurança após a validação biométrica, assegurando a transparência total.
            </Text>
          </LawSection>

          {/* DIRETRIZES DA COMUNIDADE */}
          <LawSection icon="people-outline" title="DIRETRIZES DA COMUNIDADE">
            <Text style={styles.lawText}>
              • Respeito mútuo é a base de todas as conversas.{"\n"}
              • Proibido assédio, spam ou compartilhamento de conteúdo sensível sem consentimento.{"\n"}
              • Uso indevido da imagem de terceiros resultará em banimento imediato.
            </Text>
          </LawSection>

          {/* PRIVACIDADE */}
          <LawSection icon="lock-closed-outline" title="PRIVACIDADE DE DADOS">
            <Text style={styles.lawText}>
              Seus dados de reconhecimento facial são criptografados e utilizados apenas para a validação da idade, seguindo rigorosamente a LGPD.
            </Text>
          </LawSection>

          {/* BOTÃO DE ACORDO */}
          <TouchableOpacity 
            style={styles.agreeButton} 
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={[COLORS.primary, '#00A86B']}
              style={styles.gradient}
            >
              <Text style={styles.agreeText}>ESTOU DE ACORDO COM AS DIRETRIZES</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.versionText}>Apoio: Estatuto Digital da Criança e do Adolescente</Text>
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
  introSection: {
    alignItems: 'center',
    marginVertical: 30,
    textAlign: 'center',
  },
  introTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  introSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  lawCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 20,
  },
  goldenCard: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  lawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  lawTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lawContent: {
    paddingLeft: 2,
  },
  lawText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  bold: {
    fontWeight: '900',
    color: '#FFF',
  },
  highlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  agreeButton: {
    marginTop: 20,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  versionText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 25,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
