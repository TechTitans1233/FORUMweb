import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import 'dotenv/config';
import path, { dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import https from 'https';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import publiRoutes from './routes/publications.js';
import validateRoutes from './routes/validate.js';
import commentRoutes from './routes/comments.js';
import friendRoutes from './routes/friends.js';
import loginRoutes from './routes/login.js';
import notificationRoutes from './routes/notifications.js';
import logoutRoutes from './routes/logout.js'
import imgRoutes from './routes/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

const options = {
    key: readFileSync('key.pem'),
    cert: readFileSync('cert.pem'),
};

https.createServer(options, app).listen(port, () => {
    console.log('Servidor HTTPS rodando em https://localhost:3000');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 15 * 60 * 1000
   }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

app.get('/', async (req, res) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'forum/forum.html'));
});

app.get('/login', async (req, res) => {
    if (req.cookies.token) {
        return res.redirect('/forum');
    }
    res.sendFile(path.join(__dirname, 'views', 'login/login.html'));
});

app.get('/forum', async (req, res) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'forum/forum.html'));
});

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token inválido' });
      req.user = user;
      next();
  });
};

app.get('/perfil', authenticateToken, async (req, res) => {
    return res.redirect(`/perfil/${req.user.uid}`);
});

app.get('/perfil/:usuarioId', async (req, res) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'perfil/perfil.html'));
});

app.get('/admin', async (req, res) => {
    if (!req.cookies.adminToken) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin/admin.html'));
});

app.get('/mapa', async (req, res) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'mapa/mapa.html'));
});

app.get('/configuracoes', async (req, res) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }
    res.status(200).json("Desenvolver");
});

app.get('/land', async (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'land/landPAGE.html'));
});

app.get('/test/test', async (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'test/test.html'));
});

app.get('/test/ia', async (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'test/testM.html'));
});

app.get("/logout", async (req, res) => {
  //console.log(req.cookies);
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  req.session.destroy();
  //res.json({ message: "Logout realizado com sucesso" });
  return res.redirect('/login');
});



app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/publicacoes', publiRoutes);
app.use('/api/comentarios', authenticateToken, commentRoutes);
app.use('/api/amigos', authenticateToken, friendRoutes);
app.use('/api/notificacoes', authenticateToken, notificationRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/logout', logoutRoutes);
app.use('/api/validate-token', validateRoutes);
app.use('/api/images', authenticateToken, imgRoutes);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404/404.html'));
});