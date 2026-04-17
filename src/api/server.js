const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const botRoutes = require('./routes/bot');

const app = express();
const port = process.env.PORT || 3000;

// SSL sertifika dosyalarının yolu
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'private.key')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.crt'))
};

// Middleware
app.use(cors({
    origin: 'https://benbotdegilim.online',
    credentials: true
  }));
app.use(express.json());

// Routes
app.use('/api/bot', botRoutes());

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// HTTPS server'ı başlat
https.createServer(sslOptions, app).listen(port, () => {
    console.log(`[API] HTTPS Server is running on port ${port}`);
}); 