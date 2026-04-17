const express = require('express');
const cors = require('cors');
const botRoutes = require('./routes/bot');

const app = express();
const port = process.env.PORT || 3000;
let server = null;
let routesRegistered = false;

// Middleware
app.use(cors({
    origin: ['https://benbotdegilim.online', 'https://api.benbotdegilim.online'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// API'yi başlat
const start = (client) => {
    try {
        if (!routesRegistered) {
            app.use('/api/bot', botRoutes(client));
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
