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

// Rota para criar comentários
router.post('/', async (req, res) => { // Protegida
    try {
        // userId e userName podem vir do token decodificado (req.user)
        const usuarioId = req.user.uid;
        const usuarioNome = req.user.name;

        const { publicacaoId, comentario } = req.body;

        // Verificar campos obrigatórios
        if (!publicacaoId || !comentario) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando: publicacaoId, comentario.' });
        }

        // Verificar se o comentário não é vazio
        if (comentario.trim() === '') {
            return res.status(400).json({ message: 'O comentário não pode ser vazio.' });
        }

        const novoComentario = {
            publicacaoId,
            comentario,
            usuario: usuarioNome, // <--- Usa o nome do usuário do token para consistência
            usuarioId: usuarioId, // Adiciona o ID do usuário que comentou
            dataCriacao: admin.firestore.Timestamp.now(),
        };

        const docRef = await db.collection('comentarios').add(novoComentario);
        novoComentario.id = docRef.id;

        res.status(201).json(novoComentario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar comentário.' });
    }
});

export default router;