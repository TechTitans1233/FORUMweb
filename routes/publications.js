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

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token inválido' });
      req.user = user;
      next();
  });
};

const adminAuthenticateToken = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token inválido' });
      req.user = user;
      next();
  });
};

const combinedAuth = (req, res, next) => {
    const userToken = req.cookies.token;
    const adminToken = req.cookies.adminToken;

    const tokenToVerify = userToken || adminToken;

    if (!tokenToVerify) {
        return res.status(401).json({ message: 'Acesso negado' });
    }

    jwt.verify(tokenToVerify, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};


// --- Controle de Última Publicação para evitar duplicatas rápidas ---
const lastPublicationTimes = new Map(); // Mapa para userId -> último timestamp da publicação

// Rota para criar publicação
router.post('/', authenticateToken, async (req, res) => {
    try {
        // userId e userName agora vêm do token decodificado (req.user)
        const userId = req.user.uid;
        const userName = req.user.name; // O nome do usuário que criou a publicação

        const { endereco, titulo, conteudo, lat, lon, marcacao, imageUrl } = req.body;

        // Validação básica
        if (![endereco, titulo, conteudo, lat, lon].every(Boolean)) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando: endereco, titulo, conteudo, lat, lon.' });
        }

        // --- PREVENÇÃO BÁSICA DE CLIQUE DUPLO NO BACKEND ---
        // Verifica se o usuário publicou algo muito recentemente (ex: nos últimos 3 segundos)
        const now = Date.now();
        const lastTime = lastPublicationTimes.get(userId) || 0;
        const debounceTime = 3000; // 3 segundos

        if (now - lastTime < debounceTime) {
            // Verifica se a requisição atual é idêntica à última feita
            const lastReqBody = lastPublicationTimes.get(`${userId}_lastReqBody`);
            if (JSON.stringify(req.body) === lastReqBody) {
                console.warn(`Publicação duplicada detectada para userId: ${userId}. Ignorando.`);
                return res.status(409).json({ message: 'Você já publicou algo muito semelhante recentemente. Por favor, aguarde e tente novamente.' });
            }
        }
        // Atualiza o timestamp e o corpo da requisição para o usuário
        lastPublicationTimes.set(userId, now);
        lastPublicationTimes.set(`${userId}_lastReqBody`, JSON.stringify(req.body));


        const novaPublicacao = {
            endereco,
            titulo,
            conteudo,
            lat,
            lon,
            imageUrl,
            userId,           // O ID do usuário que fez a publicação
            usuario: userName, // <--- **CORREÇÃO AQUI: Salva o nome do usuário no campo 'usuario'**
            curtidas: 0,
            dataCriacao: admin.firestore.Timestamp.now(),
        };

        // Adiciona a 'marcacao' apenas se ela existir no corpo da requisição
        if (marcacao) {
            novaPublicacao.marcacao = marcacao; // Armazena a string GeoJSON aqui
        }

        const docRef = await db.collection('publicacoes').add(novaPublicacao);
        novaPublicacao.id = docRef.id;

        res.status(201).json(novaPublicacao);
    } catch (error) {
        console.error("Erro ao criar publicação:", error);
        res.status(500).json({ message: 'Erro ao criar publicação.', error: error.message });
    }
});

// Rota para obter todas as publicações (GET)
router.get('/', combinedAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('publicacoes').get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Nenhuma publicação encontrada!' });
        }

        const publicacoes = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const curtidasSnapshot = await db.collection('curtidas')
            .where('publicacaoId', '==', doc.id)
            .get();

            const curtidasPorUsuarios = curtidasSnapshot.docs.map(doc => doc.data().userId);
            const curtidasCount = curtidasPorUsuarios.length;

            return {
                id: doc.id,
                isLikedByMe: curtidasPorUsuarios.includes(req.user.uid),
                ...data,
                curtidas: curtidasCount,
                curtidasPorUsuarios,
                dataCriacao: data.dataCriacao ? data.dataCriacao.toDate() : null,
            };
        }));

        res.status(200).json(publicacoes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar publicações', error: error.message });
    }
});

// Rota para obter uma publicação por ID (GET)
router.get('/:id', combinedAuth, async (req, res) => {
    try {
        const doc = await db.collection('publicacoes').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Publicação não encontrada!' });
        }

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar publicação', error: error.message });
    }
});

// Rota para buscar comentários de uma publicação
router.get('/:id/comentarios', combinedAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const comentariosSnapshot = await db.collection('comentarios').where('publicacaoId', '==', id).orderBy('dataCriacao', 'asc').get(); // Ordenado por data
        const comentarios = comentariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(comentarios);

        res.status(200).json(comentarios);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        res.status(500).json({ message: 'Erro ao buscar comentários.' });
    }
});

// Rota para editar uma publicação (PUT) - CONSOLIDADA - Protegida
router.put('/:id', combinedAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { endereco, titulo, conteudo, lat, lon } = req.body;

        if (!endereco && !titulo && !conteudo && !lat && !lon) {
            return res.status(400).json({ message: 'Pelo menos um campo (endereco, titulo, conteudo, lat, lon) é obrigatório para atualização.' });
        }

        const publicacaoRef = db.collection('publicacoes').doc(id);
        const publicacaoDoc = await publicacaoRef.get();

        if (!publicacaoDoc.exists) {
            return res.status(404).json({ message: 'Publicação não encontrada!' });
        }

        const updateData = {};
        if (endereco !== undefined) updateData.endereco = endereco;
        if (titulo !== undefined) updateData.titulo = titulo;
        if (conteudo !== undefined) updateData.conteudo = conteudo;
        if (lat !== undefined) updateData.lat = lat;
        if (lon !== undefined) updateData.lon = lon;

        await publicacaoRef.update(updateData);

        res.status(200).json({ message: 'Publicação atualizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar publicação', error: error.message });
    }
});

//rotas de curtidas
// Rota para curtir uma publicação - Protegida
router.post('/:id/curtir', combinedAuth, async (req, res) => {
    try {
        const userId = req.user.uid; // ID do usuário vem do token
        const publicacaoId = req.params.id;

        const curtidaExistente = await db.collection('curtidas')
            .where('publicacaoId', '==', publicacaoId)
            .where('userId', '==', userId)
            .get();

        if (!curtidaExistente.empty) {
            return res.status(400).json({ message: 'Você já curtiu esta publicação.' });
        }

        await db.collection('curtidas').add({
            publicacaoId,
            userId,
            dataCriacao: admin.firestore.Timestamp.now(),
        });

        const publicacaoRef = db.collection('publicacoes').doc(publicacaoId);
        await publicacaoRef.update({
            curtidas: admin.firestore.FieldValue.increment(1),
        });

        res.status(201).json({ message: 'Publicação curtida com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao curtir a publicação', error: error.message });
    }
});

// Rota para descurtir uma publicação - Protegida
router.delete('/:id/descurtir', combinedAuth, async (req, res) => {
    try {
        const userId = req.user.uid; // ID do usuário vem do token
        const publicacaoId = req.params.id;

        const curtidaExistente = await db.collection('curtidas')
            .where('publicacaoId', '==', publicacaoId)
            .where('userId', '==', userId)
            .get();

        if (curtidaExistente.empty) {
            return res.status(400).json({ message: 'Você ainda não curtiu esta publicação.' });
        }

        const curtidaId = curtidaExistente.docs[0].id;
        await db.collection('curtidas').doc(curtidaId).delete();

        const publicacaoRef = db.collection('publicacoes').doc(publicacaoId);
        await publicacaoRef.update({
            curtidas: admin.firestore.FieldValue.increment(-1),
        });

        res.status(200).json({ message: 'Publicação descurtida com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao descurtir a publicação', error: error.message });
    }
});

// ROTA PARA EXCLUIR MÚLTIPLAS PUBLICAÇÕES DE UMA VEZ - Protegida
router.delete('/', combinedAuth, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Nenhum id fornecido para exclusão.' });
        }

        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection('publicacoes').doc(id);
            batch.delete(docRef);
        });

        await batch.commit();
        res.status(200).json({ message: 'Publicações deletadas com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar publicações', error: error.message });
    }
});

router.get('/:publicacaoId/img', async (req, res) => {
    const { publicacaoId } = req.params;
    try {
        const doc = await db.collection('publicacoes').doc(publicacaoId).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Publicação não encontrada.' });
        }

        const publicacaoData = doc.data();
        if (!publicacaoData.imgUrl) {
            return res.status(404).json({ message: 'Imagem não encontrada.' });
        }

        res.redirect(publicacaoData.imgUrl);
    } catch (error) {
        console.error('Erro ao obter imagem da publicação:', error);
        res.status(500).json({ message: 'Erro ao obter imagem da publicação.', error: error.message });
    }
});

router.post('/:publicacaoId/img', authenticateToken, async (req, res) => {
    const { publicacaoId } = req.params;
    const { imgUrl } = req.body;
    try {
        const doc = await db.collection('publicacoes').doc(publicacaoId).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Publicação não encontrada.' });
        }

        const publicacaoData = doc.data();
        if (!publicacaoData.userId || publicacaoData.userId !== req.user.uid) {
            return res.status(403).json({ message: 'Você não tem permissão para adicionar imagem a esta publicação.' });
        }

        await db.collection('publicacoes').doc(publicacaoId).update({
            imgUrl: imgUrl
        });

        res.status(200).json({ message: 'Imagem adicionada com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar imagem à publicação:', error);
        res.status(500).json({ message: 'Erro ao adicionar imagem à publicação.', error: error.message });
    }
});

export default router;