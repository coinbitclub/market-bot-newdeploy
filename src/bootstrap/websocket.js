/**
 * 🔌 WEBSOCKET SERVER - T3 Implementation
 * Servidor WebSocket para comunicação realtime
 * Namespace padrão: /realtime
 */

const WebSocket = require('ws');
const url = require('url');

class WebSocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map<clientId, {ws, userId, subscriptions}>
        this.rooms = new Map();   // Map<roomName, Set<clientId>>
        this.heartbeatInterval = null;
    }

    /**
     * 🚀 Inicializar servidor WebSocket
     */
    initialize(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/realtime',
            verifyClient: (info) => {
                // Verificar origem CORS
                const origin = info.origin;
                const allowedOrigins = [
                    process.env.FRONTEND_ORIGIN || 'http://localhost:3003',
                    'http://localhost:3000',
                    'http://localhost:3001'
                ];
                
                return !origin || allowedOrigins.includes(origin);
            }
        });

        this.setupEventHandlers();
        this.startHeartbeat();
        
        console.log('🔌 WebSocket Server iniciado no namespace /realtime');
        return this.wss;
    }

    /**
     * 🔧 Configurar event handlers
     */
    setupEventHandlers() {
        this.wss.on('connection', (ws, request) => {
            const clientId = this.generateClientId();
            const query = url.parse(request.url, true).query;
            
            // Registrar cliente
            this.clients.set(clientId, {
                ws,
                userId: query.userId || null,
                subscriptions: new Set(),
                lastPing: Date.now(),
                connected: true
            });

            console.log(`🔗 Cliente conectado: ${clientId} (Total: ${this.clients.size})`);

            // Enviar mensagem de boas-vindas
            this.sendToClient(clientId, {
                type: 'welcome',
                clientId,
                timestamp: new Date().toISOString(),
                message: 'Conectado ao CoinBitClub Realtime'
            });

            // Event handlers do cliente
            ws.on('message', (data) => {
                this.handleClientMessage(clientId, data);
            });

            ws.on('close', () => {
                this.handleClientDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error(`❌ Erro WebSocket cliente ${clientId}:`, error.message);
                this.handleClientDisconnect(clientId);
            });

            ws.on('pong', () => {
                const client = this.clients.get(clientId);
                if (client) {
                    client.lastPing = Date.now();
                }
            });
        });

        this.wss.on('error', (error) => {
            console.error('❌ Erro WebSocket Server:', error.message);
        });
    }

    /**
     * 📨 Processar mensagens do cliente
     */
    handleClientMessage(clientId, data) {
        try {
            const message = JSON.parse(data.toString());
            const client = this.clients.get(clientId);
            
            if (!client) return;

            switch (message.type) {
                case 'subscribe':
                    this.handleSubscribe(clientId, message.channel);
                    break;
                    
                case 'unsubscribe':
                    this.handleUnsubscribe(clientId, message.channel);
                    break;
                    
                case 'join_room':
                    this.handleJoinRoom(clientId, message.room);
                    break;
                    
                case 'leave_room':
                    this.handleLeaveRoom(clientId, message.room);
                    break;
                    
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;
                    
                default:
                    console.log(`📨 Mensagem recebida de ${clientId}:`, message.type);
            }
        } catch (error) {
            console.error(`❌ Erro ao processar mensagem de ${clientId}:`, error.message);
        }
    }

    /**
     * 📡 Gerenciar subscrições
     */
    handleSubscribe(clientId, channel) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.add(channel);
        this.sendToClient(clientId, {
            type: 'subscribed',
            channel,
            timestamp: new Date().toISOString()
        });
        
        console.log(`📡 Cliente ${clientId} subscrito ao canal: ${channel}`);
    }

    handleUnsubscribe(clientId, channel) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.delete(channel);
        this.sendToClient(clientId, {
            type: 'unsubscribed',
            channel,
            timestamp: new Date().toISOString()
        });
        
        console.log(`📡 Cliente ${clientId} desinscrito do canal: ${channel}`);
    }

    /**
     * 🏠 Gerenciar salas
     */
    handleJoinRoom(clientId, roomName) {
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, new Set());
        }
        
        this.rooms.get(roomName).add(clientId);
        this.sendToClient(clientId, {
            type: 'joined_room',
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🏠 Cliente ${clientId} entrou na sala: ${roomName}`);
    }

    handleLeaveRoom(clientId, roomName) {
        if (this.rooms.has(roomName)) {
            this.rooms.get(roomName).delete(clientId);
            
            // Remover sala vazia
            if (this.rooms.get(roomName).size === 0) {
                this.rooms.delete(roomName);
            }
        }
        
        this.sendToClient(clientId, {
            type: 'left_room',
            room: roomName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🏠 Cliente ${clientId} saiu da sala: ${roomName}`);
    }

    /**
     * 🚪 Desconexão do cliente
     */
    handleClientDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remover de todas as salas
        for (const [roomName, clients] of this.rooms.entries()) {
            if (clients.has(clientId)) {
                clients.delete(clientId);
                if (clients.size === 0) {
                    this.rooms.delete(roomName);
                }
            }
        }

        // Remover cliente
        this.clients.delete(clientId);
        console.log(`🚪 Cliente desconectado: ${clientId} (Total: ${this.clients.size})`);
    }

    /**
     * 📤 Enviar mensagem para cliente específico
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.connected || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`❌ Erro ao enviar para ${clientId}:`, error.message);
            this.handleClientDisconnect(clientId);
            return false;
        }
    }

    /**
     * 📢 Broadcast para canal
     */
    broadcastToChannel(channel, message) {
        let sent = 0;
        
        for (const [clientId, client] of this.clients.entries()) {
            if (client.subscriptions.has(channel)) {
                if (this.sendToClient(clientId, { ...message, channel })) {
                    sent++;
                }
            }
        }
        
        return sent;
    }

    /**
     * 🏠 Broadcast para sala
     */
    broadcastToRoom(roomName, message) {
        const room = this.rooms.get(roomName);
        if (!room) return 0;

        let sent = 0;
        for (const clientId of room) {
            if (this.sendToClient(clientId, { ...message, room: roomName })) {
                sent++;
            }
        }
        
        return sent;
    }

    /**
     * 📢 Broadcast global
     */
    broadcast(message) {
        let sent = 0;
        
        for (const clientId of this.clients.keys()) {
            if (this.sendToClient(clientId, message)) {
                sent++;
            }
        }
        
        return sent;
    }

    /**
     * 💓 Sistema de heartbeat
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeout = 60000; // 60 segundos
            
            for (const [clientId, client] of this.clients.entries()) {
                if (now - client.lastPing > timeout) {
                    console.log(`💓 Cliente ${clientId} timeout - desconectando`);
                    client.ws.terminate();
                    this.handleClientDisconnect(clientId);
                } else if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            }
        }, 30000); // Verificar a cada 30 segundos
    }

    /**
     * 🔧 Utilitários
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getStats() {
        return {
            connectedClients: this.clients.size,
            activeRooms: this.rooms.size,
            totalSubscriptions: Array.from(this.clients.values())
                .reduce((total, client) => total + client.subscriptions.size, 0)
        };
    }

    /**
     * 🛑 Parar servidor
     */
    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        console.log('🛑 WebSocket Server parado');
    }
}

module.exports = new WebSocketServer();