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

// Rota para criar uma relação de amizade (coleção amigos)
router.post('/', async (req, res) => { // Protegida
    try {
        const { amigoId } = req.body;
        const usuarioId = req.user.uid; // ID do usuário do token

        // Evitar que o usuário siga a si mesmo
        if (usuarioId === amigoId) {
            return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
        }

        // Verificar se a relação já existe
        const amizadeExistente = await db.collection('amigos').where('usuarioId', '==', usuarioId).where('amigoId', '==', amigoId).get();

        if (!amizadeExistente.empty) {
            return res.status(400).json({ message: 'Você já está seguindo este usuário.' });
        }

        // Adicionar a nova relação de amizade
        await db.collection('amigos').add({
            usuarioId,
            amigoId,
            dataCriacao: admin.firestore.Timestamp.now(),
        });

        res.status(201).json({ message: 'Relação de amizade criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar relação de amizade', error: error.message });
    }
});

router.delete('/unfollow', async (req, res) => { // Protegida
    try {
        const { amigoId } = req.body;
        const usuarioId = req.user.uid; // ID do usuário do token 
        // Verificar se a relação de amizade existe
        const amizadeSnapshot = await db.collection('amigos')
            .where('usuarioId', '==', usuarioId)
            .where('amigoId', '==', amigoId)
            .get();
        if (amizadeSnapshot.empty) {
            return res.status(404).json({ message: 'Relação de amizade não encontrada.' });
        }
        // Deletar todos os documentos encontrados (caso haja mais de um por algum motivo)
        const batch = db.batch();
        amizadeSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        }
        );
        await batch.commit();
        res.status(200).json({ message: 'Relação de amizade deletada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar amizade', error: error.message });
    }
});

// Deleta a relação de amizade entre o usuário autenticado e outro usuário
router.delete('/:amigoId', async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const amigoId = req.params.amigoId;

        const amizadeSnapshot = await db.collection('amigos')
            .where('usuarioId', '==', usuarioId)
            .where('amigoId', '==', amigoId)
            .get();

        if (amizadeSnapshot.empty) {
            return res.status(404).json({ message: 'Relação de amizade não encontrada.' });
        }

        // Deletar todos os documentos encontrados (caso haja mais de um por algum motivo)
        const batch = db.batch();
        amizadeSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        res.status(200).json({ message: 'Relação de amizade deletada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar amizade', error: error.message });
    }
});

// Verifica se existe uma relação de amizade entre o usuário autenticado e outro usuário
router.get('/check/:amigoId', async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const amigoId = req.params.amigoId;

        const amizade = await db.collection('amigos')
            .where('usuarioId', '==', usuarioId)
            .where('amigoId', '==', amigoId)
            .get();

        if (amizade.empty) {
            return res.status(200).json({ existe: false });
        }

        return res.status(200).json({ existe: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao verificar amizade', error: error.message });
    }
});




export default router;