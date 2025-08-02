import { Router } from 'express';
const router = Router();
import admin from 'firebase-admin';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from "jsonwebtoken";

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

//Rotas para notificacoes
// Rota para criar uma notificação - Protegida
router.post('/', async (req, res) => {
    try {
        const usuarioId = req.user.uid; // ID do usuário vem do token
        const { mensagem } = req.body;

        if (!mensagem) {
            return res.status(400).json({ message: 'Mensagem é obrigatória.' });
        }

        const novaNotificacao = {
            usuarioId,
            mensagem,
            dataCriacao: admin.firestore.Timestamp.now(),
        };

        const docRef = await db.collection('notificacoes').add(novaNotificacao);
        novaNotificacao.id = docRef.id;

        res.status(201).json(novaNotificacao);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar notificação.' });
    }
});

// Rota para buscar notificações de um usuário
router.get('/:usuarioId', async (req, res) => { // Protegida
    const { usuarioId } = req.params;

    // Garante que o usuário só possa ver suas próprias notificações, a menos que seja admin
    if (req.user.uid !== usuarioId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver essas notificações.' });
    }

    try {
        const notificacoesSnapshot = await db.collection('notificacoes').where('usuarioId', '==', usuarioId).orderBy('dataCriacao', 'desc').get();
        const notificacoes = notificacoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(notificacoes);
    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        res.status(500).json({ message: 'Erro ao buscar notificações.' });
    }
});

export default router;