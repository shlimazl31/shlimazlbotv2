const express = require('express');
const cors = require('cors');
const path = require('path');
const botRoutes = require('./routes/bot');
const { getBotVersion } = require('../functions/getBotVersion.js');

const app = express();
const port = process.env.PORT || 3000;
let server = null;
let routesRegistered = false;
const allowedOrigins = [
    'https://benbotdegilim.online',
    'https://api.benbotdegilim.online',
    'https://yakupsemihbulut.com',
    'https://www.yakupsemihbulut.com',
    'https://api.yakupsemihbulut.com',
    'https://dashboard.yakupsemihbulut.com',
    'https://admin.yakupsemihbulut.com',
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.DASHBOARD_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
];

app.set('trust proxy', true);

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));
app.use(express.json({
    verify: (req, res, buffer) => {
        if ((req.originalUrl || '').includes('/payments/lemonsqueezy/webhook')) {
            req.rawBody = buffer.toString('utf8');
        }
    },
}));
app.use('/logo', express.static(path.join(__dirname, '..', 'logo')));
app.use(express.static(path.join(__dirname, 'public')));
function sendDashboard(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
}

function sendSite(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'site.html'));
}

function sendAdmin(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
}

function sendPageFallback(req, res, next) {
    if (req.method !== 'GET') return next();

    const hostname = req.hostname || '';
    const requestedPath = req.path || '';

    if (requestedPath.startsWith('/api/') || requestedPath.startsWith('/logo/')) {
        return next();
    }

    if (hostname.startsWith('api.')) {
        return next();
    }

    if (hostname.startsWith('admin.') || requestedPath.startsWith('/admin')) {
        return sendAdmin(req, res);
    }

    if (hostname.startsWith('dashboard.') || requestedPath.startsWith('/dashboard')) {
        return sendDashboard(req, res);
    }

    return sendSite(req, res);
}

app.get('/dashboard', sendDashboard);
app.get('/admin', sendAdmin);
app.get('/contact', (req, res) => res.redirect(302, 'https://yakupsemihbulut.com'));
app.get(['/features', '/commands', '/pricing', '/faq', '/privacy', '/terms', '/refunds', '/refund-policy'], sendSite);
app.get('/', (req, res) => {
    if ((req.hostname || '').startsWith('admin.')) return sendAdmin(req, res);
    if (!(req.hostname || '').startsWith('api.')) return sendSite(req, res);

    res.json({
        name: 'ShlimazlBot API',
        version: getBotVersion(),
        status: '/api/bot/status',
        premium: '/api/bot/premium/:guildId',
        admin: '/api/bot/admin/summary',
    });
});

// API'yi başlat
const start = (client) => {
    try {
        if (!routesRegistered) {
            app.use('/api/bot', botRoutes(client));
            app.use(sendPageFallback);
            app.use((err, req, res, next) => {
                console.error(err.stack);
                res.status(500).json({ error: 'Something broke!' });
            });
            routesRegistered = true;
        }

        if (server) {
            return server;
        }

        server = app.listen(port, '0.0.0.0', () => {
            console.log(`[API] Server is running on port ${port}`);
            console.log(`[API] Server is accessible at http://localhost:${port}`);
        });

        return server;
    } catch (error) {
        console.error('[ERROR] API server failed to start:', error.message);
        return null;
    }
};

module.exports = { start }; 
