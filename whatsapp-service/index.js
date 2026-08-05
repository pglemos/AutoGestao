require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const corsOptions = require('./cors-config');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const app = express();

// Segurança: Rate Limiting (100 pedidos a cada 15 minutos por IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(limiter);

app.use(compression()); // Otimização: Gzip compression para payloads QR e JSON
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Segurança e Perf: Limitar tamanho do JSON

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const WHATSAPP_API_KEY = process.env.VITE_WHATSAPP_API_KEY;

// Security Middleware
const authenticateAPI = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!WHATSAPP_API_KEY) {
        console.error('CRITICAL: VITE_WHATSAPP_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!apiKey || apiKey !== WHATSAPP_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }

    next();
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let qrCodeData = '';
let qrImage = '';
let isConnected = false;

console.log('Starting WhatsApp Client...');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('QR RECEIVED - Displaying in frontend');
    qrCodeData = qr;
    try {
        qrImage = await qrcode.toDataURL(qr);
    } catch (err) {
        console.error('Failed to generate QR string', err);
    }
});

client.on('ready', () => {
    isConnected = true;
    qrCodeData = '';
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    isConnected = false;
});

client.initialize();

// Authentication Middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!process.env.VITE_WHATSAPP_API_KEY || apiKey !== process.env.VITE_WHATSAPP_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// API Routes for Frontend Integration
app.get('/api/whatsapp/status', authenticate, (req, res) => {
    res.json({
        connected: isConnected,
        qr: isConnected ? null : qrImage
    });
});

app.post('/api/whatsapp/restart', authenticate, async (req, res) => {
    console.log('Restarting WhatsApp Client...');
    try {
        if (client) {
            await client.destroy();
        }
        isConnected = false;
        qrImage = '';
        client.initialize();
        res.json({ success: true, message: 'Client restart initiated' });
    } catch (error) {
        console.error('Failed to restart client:', error);
        res.status(500).json({ error: 'Failed to restart client' });
    }
});

app.post('/api/whatsapp/send', authenticate, async (req, res) => {
    if (!isConnected) {
        return res.status(400).json({ error: 'WhatsApp is not connected. Scan the QR code first.' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    try {
        const cleanPhone = phone.replace(/\D/g, '');
        // Append Brazil country code if not present and only 10/11 digits
        const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        const chatId = `${finalPhone}@c.us`;

        await client.sendMessage(chatId, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

const startServer = () => {
    // Start Server
    app.listen(PORT, () => {
        console.log(`WhatsApp Service listening on port ${PORT}`);
    });
};

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, client };
