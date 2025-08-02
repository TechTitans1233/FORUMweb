import { Router } from 'express';
const router = Router();
import admin from 'firebase-admin';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(
    resolve(__dirname, '../serviceAccountKey', 'projeto-pi2-firebase-adminsdk-phn8l-3bee21c2cb.json'),
    'utf8'
  )
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://projeto-pi2.firebaseio.com'
  });
}

const db = admin.firestore();

//////////////////////
// Rota para login administrativo
router.post('/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Senha administrativa é obrigatória!' });
    }

    if (password === 'suaSenhaAdministrativa') { // AINDA UMA SENHA HARDCODED, MUDE ISSO EM PRODUÇÃO
        const token = jwt.sign({ role: 'admin' }, process.env.SECRET_KEY, { expiresIn: '1h' });
        res.cookie("adminToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 60 * 60 * 1000, // Expira em 1 hora
        });
        return res.status(200).json({ message: 'Login administrativo realizado com sucesso!', token });
    } else {
        return res.status(403).json({ message: 'Senha administrativa incorreta.' });
    }
});


const authenticateToken = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token inválido' });
      req.user = user;
      next();
  });
};

// Rota protegida para administradores
router.get('/protected', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
    }
    res.status(200).json({ message: 'Você acessou uma rota protegida!', user: req.user });
});

// Rota para atualizar usuário com dados antigos e novos
router.put('/usuarios/:userId', authenticateToken, async (req, res) => { // Protegida
    try {
        const { userId } = req.params;
        const { newName, newEmail, password } = req.body;

        // Verificar se o usuário existe com o ID fornecido
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const userData = userDoc.data();

        // Verificar se a senha fornecida corresponde à senha do banco de dados (Apenas para simulação. NÃO USE EM PRODUÇÃO!)
        if (userData.password !== password) {
            return res.status(400).json({ message: 'Senha incorreta!' });
        }

        // Atualizar os dados do usuário
        await userRef.update({
            name: newName,
            email: newEmail,
        });

        // --- CORREÇÃO AQUI: Atualizar o campo 'usuario' nas publicações ---
        // Buscamos as publicações DO USUÁRIO específico pelo userId
        const postsRef = db.collection('publicacoes').where('userId', '==', userId);
        const postsSnapshot = await postsRef.get();
        const batch = db.batch();

        postsSnapshot.forEach(postDoc => {
            // Atualiza o campo 'usuario' (nome do autor) para o novo nome
            batch.update(postDoc.ref, { usuario: newName });
        });

        await batch.commit();

        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
    }
});

export default router;