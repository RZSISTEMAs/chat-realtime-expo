# 📱 NextGen Messaging — Chat em Tempo Real

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue)
![Platform](https://img.shields.io/badge/Plataforma-Android%20%7C%20iOS%20%7C%20Web-brightgreen)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)
![Socket.io](https://img.shields.io/badge/RealTime-Socket.io-orange)
![MySQL](https://img.shields.io/badge/Banco-MySQL-blue)

Um aplicativo de mensagens instantâneas moderno e multiplataforma, construído com **React Native (Expo)**, **Node.js** e **Socket.io**. Suporte completo a **Android**, **iOS** e **Web (navegador)**.

---

## 🚀 Funcionalidades

### 💬 Chat em Tempo Real
- Mensagens instantâneas via WebSockets (Socket.io)
- Histórico de conversas **permanente** (sem exclusão automática)
- Envio e recebimento de **fotos** nas conversas
- Badge de mensagens não lidas por contato
- Marcar mensagens como lidas automaticamente ao abrir o chat

### 🔔 Notificações Inteligentes (Mobile)
- Alertas sonoros ao receber mensagens (Expo AV)
- Feedback tátil (vibração) rítmico
- Notificações locais nativas (Expo Notifications)
- Sistema 100% blindado: **notificações ignoradas silenciosamente no navegador Web**

### 👤 Perfis Completos
- Foto de perfil e foto de capa personalizáveis
- Bio/Status com **auto-save** (salva automaticamente enquanto você digita)
- Badge de verificação de identidade (via scan facial)
- Badge de idade

### 🌐 Compatibilidade Multiplataforma
- Interface adaptativa para **Android**, **iOS** e **Web (computador)**
- Blur effects no iOS, glassmorphism no Android/Web
- Layout responsivo com limite de largura no navegador

### 📸 Status / Stories
- Postagem de fotos e vídeos como status temporário (24h)
- Visualização e reações (emojis) nos status
- Contador de visualizações (apenas para o dono do status)

### 🏅 Sistema de Verificação
- Verificação de identidade por reconhecimento facial (face-scan)
- Selo visual de usuário verificado no perfil e no chat

### 👥 Contatos e Busca
- Lista de todos os usuários cadastrados
- Busca por nome ou @usuário em tempo real
- Indicador de online/offline em tempo real
- Modal de perfil premium ao tocar em um usuário

---

## 🛠️ Tecnologias

### Frontend (Mobile + Web)
| Tecnologia | Uso |
|---|---|
| **Expo SDK 54** / React Native | Base do aplicativo |
| **Expo Router** | Navegação estruturada (file-based) |
| **Socket.io-client** | Comunicação em tempo real |
| **Expo AV** | Reprodução de som nas notificações |
| **Expo Notifications** | Notificações locais nativas |
| **Expo Image Picker** | Upload de fotos de perfil e mídia |
| **Expo Blur** | Efeitos de glassmorphism no iOS |
| **Expo Linear Gradient** | Sobreposições de gradiente |
| **AsyncStorage** | Sessão de usuário local |
| **Axios** | Requisições HTTP |

### Backend (Servidor)
| Tecnologia | Uso |
|---|---|
| **Node.js** + Express | Servidor HTTP |
| **Socket.io** | WebSockets em tempo real |
| **MySQL** + mysql2 | Banco de dados relacional |
| **Multer** | Upload de arquivos |
| **node-cron** | Limpeza de status expirado |

---

## 📦 Como Instalar

### Pré-requisitos
- Node.js v18+
- Servidor MySQL (recomendado: [Laragon](https://laragon.org/) ou XAMPP)
- Expo Go instalado no celular (para testes em dispositivos físicos)

### 1. Clonar o repositório
```bash
git clone https://github.com/RZSISTEMAs/chat-realtime-expo.git
cd chat-realtime-expo
```

### 2. Configurar o Backend
```bash
cd backend
npm install
```

Configure o `.env` (ou edite `server.js` diretamente) com suas credenciais de banco:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=app_celular
PORT=3000
```

Crie o banco de dados:
```sql
CREATE DATABASE app_celular;
```
> O servidor criará as tabelas automaticamente ao iniciar.

### 3. Iniciar o Backend
```bash
node server.js
# Servidor rodando em http://0.0.0.0:3000
```

### 4. Configurar o Frontend

Edite `src/constants/api.ts` com o **IP da sua máquina na rede local**:
```typescript
// Descubra seu IP com: ipconfig (Windows) ou ifconfig (macOS/Linux)
export const API_URL = 'http://SEU_IP_LOCAL:3000';
export const API_BASE = `${API_URL}/api`;
```

### 5. Iniciar o App
```bash
# Na raiz do projeto
npm install
npx expo start
```
- **Celular**: Escaneie o QR Code com o app **Expo Go**
- **Computador**: Pressione `w` no terminal para abrir no navegador

---

## 📂 Estrutura do Projeto

```
├── src/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── chats.tsx       # Lista de conversas + Stories + Online
│   │   │   ├── contacts.tsx    # Busca e lista de usuários
│   │   │   └── settings.tsx    # Perfil, bio e configurações
│   │   ├── chat/
│   │   │   └── [id].tsx        # Tela de chat individual
│   │   ├── _layout.tsx         # Layout raiz + configuração de notificações
│   │   ├── index.tsx           # Tela de login/cadastro
│   │   ├── face-scan.tsx       # Verificação de identidade
│   │   ├── my-badges.tsx       # Insígnias e conquistas
│   │   └── help-support.tsx    # Central de ajuda e diretrizes
│   ├── components/
│   │   ├── ProfileModal.tsx    # Modal de perfil público premium
│   │   └── ...                 # Outros componentes reutilizáveis
│   └── constants/
│       ├── api.ts              # URL base da API
│       ├── theme.ts            # Cores, sombras e tamanhos
│       └── media.ts            # Helper de FormData para upload
├── backend/
│   └── server.js               # Servidor Express + Socket.io + MySQL
├── assets/                     # Ícones e imagens
└── app.json                    # Configuração do Expo
```

---

## 🔧 Decisões Técnicas Relevantes

- **Persistência permanente**: O cron job que apagava mensagens após 24h foi removido. Todo o histórico é mantido indefinidamente.
- **Proteção multiplataforma**: Chamadas de `Vibration`, `Audio`, e `Notifications` são protegidas por `Platform.OS !== 'web'` para não crashar no navegador.
- **URLs de imagem normalizadas**: O servidor sempre entrega links absolutos (`http://IP:3000/uploads/...`) via a função `formatUserResponse`, evitando erros de carregamento no app.
- **Auto-save de bio**: A bio é salva automaticamente 1 segundo após o usuário parar de digitar, sem precisar de botão de salvar.

---

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Faça o commit (`git commit -m 'feat: minha nova feature'`)
4. Faça o push (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

Desenvolvido com ❤️ por **Richard Zamoner** — RZSISTEMA
