// RUTA: server.js

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import './src/config/passport.js';

// --- IMPORTACIÓN DE RUTAS Y MIDDLEWARES ---
import authRoutes from './src/modules/auth/routes/auth.routes.js';
import webhookRoutes from './src/modules/webhooks/routes/webhook.routes.js';
import eventsRoutes from './src/modules/events/routes/events.routes.js';
import requestLogger from './src/shared/middlewares/requestLogger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES GLOBALES ---
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ✅ Configuración de CORS para permitir cookies en frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, 
  })
);

// Sesión (requerida por passport.session)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'un_secreto_muy_fuerte',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax' 
    }
  })
);

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// --- RUTAS DE LA APLICACIÓN ---
app.get('/', (req, res) => {
  res.send('Servidor funcionando con Passport y GitHub Auth! 🚀');
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Para las rutas de webhooks, usamos express.raw() para obtener el cuerpo como un Buffer
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Para el resto de las rutas de la API, usamos express.json()
app.use('/events', express.json(), eventsRoutes);

// Manejo de la ruta de fallo de login
app.get('/login-failed', (req, res) => {
  res.status(401).send('Fallo la autenticación.');
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});