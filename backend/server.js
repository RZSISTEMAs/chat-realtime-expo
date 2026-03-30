require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'app_celular',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Inicialização do Banco de Dados (Adiciona colunas se não existirem)
const initDB = async () => {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        const colNames = columns.map((c) => c.Field);
        
        if (!colNames.includes('is_online')) {
            await pool.query('ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0');
            console.log('Coluna is_online adicionada.');
        }
        if (!colNames.includes('last_seen')) {
            await pool.query('ALTER TABLE users ADD COLUMN last_seen DATETIME');
            console.log('Coluna last_seen adicionada.');
        }
        if (!colNames.includes('profile_pic')) {
            await pool.query('ALTER TABLE users ADD COLUMN profile_pic VARCHAR(255)');
            console.log('Coluna profile_pic adicionada.');
        }
        if (!colNames.includes('profile_background')) {
            await pool.query('ALTER TABLE users ADD COLUMN profile_background VARCHAR(255)');
            console.log('Coluna profile_background adicionada.');
        }
        if (!colNames.includes('description')) {
            await pool.query('ALTER TABLE users ADD COLUMN description TEXT');
            console.log('Coluna description adicionada.');
        }
        if (!colNames.includes('age')) {
            await pool.query('ALTER TABLE users ADD COLUMN age INT');
            console.log('Coluna age adicionada.');
        }
        if (!colNames.includes('is_verified')) {
            await pool.query('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0');
            console.log('Coluna is_verified adicionada.');
        }
        await pool.query('UPDATE users SET is_online = 0');

        // Garante que o ENUM de media_type aceite 'image' (REPARO)
        await pool.query("ALTER TABLE messages MODIFY COLUMN media_type ENUM('text', 'audio', 'video', 'image') DEFAULT 'text'");
        
        const [msgCols] = await pool.query('SHOW COLUMNS FROM messages');
        const msgColNames = msgCols.map((c) => c.Field);
        if (!msgColNames.includes('is_read')) {
            await pool.query('ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0');
            console.log('Coluna is_read adicionada à tabela messages.');
        }

        console.log('[BD] Tabela de mensagens atualizada.');

        // Tabela para interações de status (Visualizações e Reações)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS status_interactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                status_id INT NOT NULL,
                user_id INT NOT NULL,
                reaction VARCHAR(50),
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (status_id) REFERENCES status(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(status_id, user_id)
            )
        `);
        console.log('[BD] Tabela de interações de status inicializada.');
    } catch (err) {
        console.error('Erro ao inicializar BD:', err);
    }
};
initDB();

// Função auxiliar para formatar resposta de usuário e completar URLs de imagem
const formatUserResponse = (user) => {
    if (!user) return null;
    const u = { ...user };
    const baseUrl = 'http://172.20.10.6:3000'; // Removido /uploads/ daqui para evitar duplicação
    
    // Formata Foto de Perfil
    if (u.profile_pic && !u.profile_pic.startsWith('http')) {
        const cleanPath = u.profile_pic.startsWith('/') ? u.profile_pic : `/uploads/${u.profile_pic}`;
        u.profile_pic = `${baseUrl}${cleanPath}`;
    }
    
    // Formata Fundo de Perfil
    if (u.profile_background && !u.profile_background.startsWith('http')) {
        const cleanPath = u.profile_background.startsWith('/') ? u.profile_background : `/uploads/${u.profile_background}`;
        u.profile_background = `${baseUrl}${cleanPath}`;
    }
    return u;
};

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// === Endpoints ===

// Registro / Login Simples (Neste MVP o criar/logar pode ser uma tela)
app.post('/api/users/register', async (req, res) => {
    const { name, username, age, description, password } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username já existe. Tente outro ou faça login.' });
        }
        const [result] = await pool.query(
            'INSERT INTO users (name, username, age, description, password) VALUES (?, ?, ?, ?, ?)',
            [name, username, age, description || '', password || null]
        );
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        res.json({ success: true, user: formatUserResponse(rows[0]) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        
        const user = users[0];
        if (user.password && user.password !== password) {
            return res.status(401).json({ error: 'Senha/PIN incorreto' });
        }
        
        res.json({ success: true, user: formatUserResponse(user) });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.post('/api/users/verify', async (req, res) => {
    const { userId, age } = req.body;
    console.log(`[API] Tentativa de verificação recebida: UserID=${userId}, Age=${age}`);
    try {
        if (!userId) {
            console.error('[API] Erro: userId não fornecido na verificação');
            return res.status(400).json({ error: 'UserID é obrigatório' });
        }

        if (age) {
            await pool.query('UPDATE users SET is_verified = 1, age = ? WHERE id = ?', [age, userId]);
            console.log(`[API] Usuário ${userId} verificado com idade ${age}`);
        } else {
            await pool.query('UPDATE users SET is_verified = 1 WHERE id = ?', [userId]);
            console.log(`[API] Usuário ${userId} verificado (sem alteração de idade)`);
        }
        
        res.json({ success: true, is_verified: 1, age });
        
        // Disparar broadcast
        broadcastOnlineUsers();
    } catch (err) {
        console.error('[API] Erro interno na verificação:', err);
        res.status(500).json({ error: 'Erro ao verificar usuário no banco de dados' });
    }
});

app.get('/api/users/search/:username', async (req, res) => {
    try {
        const searchValue = req.params.username;
        const [users] = await pool.query(
            'SELECT id, name, username, age, description, profile_pic, profile_background, is_verified FROM users WHERE username LIKE ? LIMIT 10',
            [`%${searchValue}%`]
        );
        res.json(users.map(formatUserResponse));
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, username, age, description, profile_pic, profile_background, is_verified FROM users'
        );
        res.json(users.map(formatUserResponse));
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Atualizar Perfil (Senha, Foto, Capa e Status) com Suporte a Atualização Parcial
app.post('/api/users/update', async (req, res) => {
    const { userId, password, profile_pic, profile_background, description } = req.body;
    console.log(`[API] Tentativa de atualização de perfil para Usuário ${userId}...`);
    
    try {
        // Usamos COALESCE para manter o valor atual se o novo for nulo/undefined
        // Para a descrição, permitimos string vazia '' explicitamente
        await pool.query(
            `UPDATE users SET 
                password = COALESCE(?, password), 
                profile_pic = COALESCE(?, profile_pic), 
                profile_background = COALESCE(?, profile_background), 
                description = ? 
             WHERE id = ?`,
            [
                password || null, 
                profile_pic || null, 
                profile_background || null, 
                description !== undefined ? description : null, 
                userId
            ]
        );
        
        // 2. Buscar o estado final do usuário (Garantindo que pegamos todos os campos necessários)
        const [updatedRows] = await pool.query(
            'SELECT id, name, username, profile_pic, profile_background, description, age, is_verified, is_online FROM users WHERE id = ?', 
            [userId]
        );
        
        const updatedUser = updatedRows[0];

        if (!updatedUser) {
            console.error(`[API] Erro: Usuário ${userId} não encontrado após update.`);
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const formattedUser = formatUserResponse(updatedUser);
        res.json({ success: true, ...formattedUser });
        
        // Broadcast global: Bios, fotos e capas agora mudam na hora para todos
        if (formattedUser && formattedUser.id) {
            io.emit('user_updated', formattedUser);
            broadcastOnlineUsers();
            console.log(`[API] Perfil do usuário ${userId} sincronizado e broadcast enviado.`);
        }
    } catch (err) {
        console.error('[API] Erro crítico ao atualizar perfil:', err);
        res.status(500).json({ error: 'Erro interno ao salvar no banco de dados' });
    }
});

// Puxar aba principal de Histórico (Contatos com quem já conversou)
app.get('/api/chats/history/:userId', async (req, res) => {
    const { userId } = req.params;
    const uid = Number(userId);

    try {
        // Query de alta performance: Agrupa por contato e traz apenas a mensagem mais recente
        const [history] = await pool.query(`
            SELECT 
                u.id, u.name, u.username, u.profile_pic, u.is_verified,
                m.content_text, m.media_type, m.created_at as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
            FROM users u
            INNER JOIN (
                SELECT 
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id,
                    MAX(id) as last_msg_id
                FROM messages 
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY contact_id
            ) last_msgs ON u.id = last_msgs.contact_id
            INNER JOIN messages m ON last_msgs.last_msg_id = m.id
            ORDER BY m.created_at DESC
        `, [uid, uid, uid, uid]);
        
        // Aplica a formatação automática de URLs de imagem
        res.json(history.map(formatUserResponse));
    } catch(err) {
        console.error('[History] Falha crítica:', err);
        res.status(500).json({ error: 'Erro ao carregar estrutura de chat' });
    }
});

// Puxar Histórico de Conversa (entre 2 usuarios)
app.get('/api/messages/:userId/:contactId', async (req, res) => {
    const { userId, contactId } = req.params;
    try {
        const [messages] = await pool.query(`
            SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `, [userId, contactId, contactId, userId]);
        res.json(messages);
    } catch(err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Marcar mensagens como lidas
app.post('/api/messages/mark-read', async (req, res) => {
    const { userId, contactId } = req.body;
    try {
        await pool.query(
            'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
            [contactId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao marcar como lido' });
    }
});

// Upload endpoint
app.post('/api/upload', (req, res, next) => {
    console.log('[Multer] Recebendo tentativa de upload...');
    next();
}, upload.single('media'), (req, res) => {
    if (!req.file) {
        console.error('[Multer] Erro: Nenhum arquivo no req.file');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    console.log('[Multer] Arquivo salvo:', req.file.filename);
    res.json({ media_url: `/uploads/${req.file.filename}` });
});

// === Status (Stories) ===
app.post('/api/status', async (req, res) => {
    const { userId, mediaUrl, mediaType, contentText } = req.body;
    try {
        await pool.query(
            'INSERT INTO status (user_id, media_url, media_type, content_text) VALUES (?, ?, ?, ?)',
            [userId, mediaUrl, mediaType || 'image', contentText || '']
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao postar status' });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        // Pega status das últimas 24h e agrupa por usuário
        const [rows] = await pool.query(`
            SELECT s.*, u.name, u.username, u.profile_pic, u.profile_background, u.description, u.age, u.is_verified 
            FROM status s
            JOIN users u ON s.user_id = u.id
            WHERE s.created_at >= (NOW() - INTERVAL 1 DAY)
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar status' });
    }
});

// Registrar visualização de status
app.post('/api/status/view', async (req, res) => {
    const { statusId, userId } = req.body;
    try {
        await pool.query(`
            INSERT INTO status_interactions (status_id, user_id) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE viewed_at = NOW()
        `, [statusId, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
});

// Registrar/Remover Reação
app.post('/api/status/react', async (req, res) => {
    const { statusId, userId, reaction } = req.body;
    try {
        await pool.query(`
            INSERT INTO status_interactions (status_id, user_id, reaction) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE reaction = ?
        `, [statusId, userId, reaction, reaction]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar reação' });
    }
});

// Pegar quem visualizou (Apenas para o dono do status)
app.get('/api/status/:statusId/viewers', async (req, res) => {
    const { statusId } = req.params;
    try {
        const [viewers] = await pool.query(`
            SELECT si.reaction, si.viewed_at, u.id, u.name, u.username, u.profile_pic
            FROM status_interactions si
            JOIN users u ON si.user_id = u.id
            WHERE si.status_id = ?
            ORDER BY si.viewed_at DESC
        `, [statusId]);
        res.json(viewers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar visualizadores' });
    }
});


// === Socket.IO para tempo real ===
const onlineUsers = new Map(); // userId -> Set of socketIds

async function broadcastOnlineUsers() {
    try {
        const [users] = await pool.query(
            'SELECT id, name, username, profile_pic, profile_background, description, age, is_verified FROM users WHERE is_online = 1'
        );
        io.emit('update_online_users', users.map(formatUserResponse));
        console.log(`[Socket] Broadcast: ${users.length} usuários online.`);
    } catch (err) {
        console.error('[Socket] Erro no broadcast:', err);
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // O usuário escuta a própria "sala" baseada no seu ID do banco.
    socket.on('join', async (userId) => {
        const uid = Number(userId);
        if (isNaN(uid)) return;

        socket.userId = uid;
        socket.join(`user_${uid}`);
        
        if (!onlineUsers.has(uid)) {
            onlineUsers.set(uid, new Set());
            // Marcar como online no banco apenas se for a primeira conexão
            await pool.query('UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?', [uid]);
            console.log(`[Socket] Usuário ${uid} entrou (Primeira conexão). Total Sockets: 1`);
        } else {
            onlineUsers.get(uid).add(socket.id);
            console.log(`[Socket] Usuário ${uid} adicionou novo socket. Total Sockets: ${onlineUsers.get(uid).size}`);
        }
        
        broadcastOnlineUsers();
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            const uid = socket.userId;
            const userSockets = onlineUsers.get(uid);
            
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(uid);
                    // Marcar como offline no banco apenas se não houver mais conexões
                    await pool.query('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [uid]);
                    console.log(`[Socket] Usuário ${uid} saiu (Última conexão).`);
                }
            }
            broadcastOnlineUsers();
        }
    });

    socket.on('send_message', async (data) => {
        // data: { sender_id, receiver_id, content_text, media_url, media_type }
        console.log(`[Socket] Mensagem de ${data.sender_id} para ${data.receiver_id}`);
        try {
            const [result] = await pool.query(`
                INSERT INTO messages (sender_id, receiver_id, content_text, media_url, media_type)
                VALUES (?, ?, ?, ?, ?)
            `, [data.sender_id, data.receiver_id, data.content_text || null, data.media_url || null, data.media_type || 'text']);

            const [newMsgRows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
            const newMsg = newMsgRows[0];

            // Emitir de volta para o Remetente e para o Destinatário
            io.to(`user_${data.sender_id}`).emit('receive_message', newMsg);
            io.to(`user_${data.receiver_id}`).emit('receive_message', newMsg);

        } catch(err) {
            console.error('[Socket] Erro ao salvar e enviar msg', err);
        }
    });
});

// Endpoint de Debug para ver quem o banco acha que está online
app.get('/api/debug/status', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, username, is_online, last_seen FROM users');
        res.json({
            database_users: users,
            memory_socket_map: Array.from(onlineUsers.entries()).map(([id, set]) => ({ userId: id, socketCount: set.size }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === CRON JOB (Apagar mensagens mais velhas que 24 horas) ===
// Rodar a cada hora: '0 * * * *'
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Rodando limpeza de mensagens e status velhos...');
    try {
        // A limpeza de mensagens foi REMOVIDA para garantir persistência total conforme solicitado pelo usuário.
        // As mensagens NÃO somem mais após 24 horas.

        // 2. Limpeza de Status (Opcional: Stories costumam sumir, mas mantive se desejar)
        const [oldStatus] = await pool.query(`
            SELECT id, media_url FROM status 
            WHERE created_at < (NOW() - INTERVAL 1 DAY)
        `);
        if (oldStatus.length > 0) {
            for (let s of oldStatus) {
                if (s.media_url && s.media_url.includes('/uploads/')) {
                    const filepath = path.join(__dirname, 'uploads', s.media_url.split('/uploads/')[1]);
                    if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
                }
            }
            await pool.query('DELETE FROM status WHERE id IN (?)', [oldStatus.map(s => s.id)]);
        }
        
        console.log('[CRON] Limpeza de Status concluída. Mensagens preservadas.');
    } catch(err) {
        console.error('[CRON] Erro:', err);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend rodando em: http://0.0.0.0:${PORT}`);
});
