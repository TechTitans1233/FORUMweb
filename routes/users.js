import { Router } from 'express';
const router = Router();
import admin from 'firebase-admin';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from "jsonwebtoken";
import cookieParser from 'cookie-parser';
router.use(cookieParser());

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

// Rota única para criar usuário
router.post('/', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios: name, email, password.' });
        }
        // Verifica se o e-mail já está em uso para evitar duplicatas antes de criar
        const userSnapshot = await db.collection('users').where('email', '==', email).get();
        if (!userSnapshot.empty) {
            return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }

        // Cria no Auth e salva no Firestore
        const userRecord = await admin.auth().createUser({ email, password, displayName: name });
        // **ATENÇÃO:** Armazenar senha no Firestore é uma PRÁTICA INSEGURA.
        // Em produção, NUNCA armazene senhas em texto plano ou reversível no Firestore.
        // O ideal é usar apenas o Firebase Authentication e não duplicar a senha aqui.
        await db.collection('users').doc(userRecord.uid).set({ name, email, password });
        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName
            }
        });
    } catch (err) {
        console.error(err);
        // Trata erros de email já em uso do Firebase Auth
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: 'Este e-mail já está cadastrado no sistema de autenticação.' });
        }
        return res.status(500).json({ message: 'Erro interno ao criar usuário', error: err.message });
    }
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

const adminAuthenticateToken = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.status(401).json({ message: 'Acesso negado' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token inválido' });
      req.user = user;
      next();
  });
};

router.get('/me', authenticateToken, async (req, res) => {
    console.log("Rota /me acessada");
    console.log("Dados do usuário:", req.user);
    try {
        const { uid, name, email } = req.user; // Obtém os dados do token
        res.status(200).json({ uid, name, email }); // ✅ Envia resposta corretamente
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
});

// Rota para obter todos os usuários, ocultando a senha
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Nenhum usuário encontrado!' });
        }
        const users = snapshot.docs.map(doc => {
            const { password, ...userData } = doc.data(); // Remove a senha do retorno
            return { id: doc.id, ...userData };
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }
});

// ROTA PARA VERIFICAR SE O EMAIL JA ESTA CADASTRADO.
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const snapshot = await db.collection('users').where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(200).json({ isUnique: true });
        }

        return res.status(200).json({ isUnique: false });
    } catch (error) {
        return res.status(500).json({
            message: 'Erro ao verificar o e-mail',
            error: error.message
        });
    }
});

// Rota para buscar um usuário pelo email e retornar nome, email e id
// firestore bloqueia, tem q dá permissão no site
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const snapshot = await db.collection('users').where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const user = snapshot.docs.map(doc => {
            const { name, email } = doc.data();
            return { id: doc.id, name, email };
        })[0];

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
});

//get user info by id
router.get('/:userId', async (req, res) => {
    try {

        const userId = req.params.userId;
        const doc = await db.collection('users').doc(userId).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const { name, email } = doc.data();
        const user = { id: doc.id, name, email };

        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
});

// Rota para buscar as publicacoes de um usuario especifico.
router.get('/:userId/publications', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Adição: Verificar se o usuário logado tem permissão para ver essas publicações
        // Exemplo 1: Apenas o próprio usuário pode ver suas publicações
        /*if (req.user.uid !== userId) {
            // Exemplo 2: Se você quiser que admins também possam ver:
            // if (req.user.uid !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver as publicações deste usuário.' });
        }*/


        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const user = { id: userDoc.id, name: userDoc.data().name, email: userDoc.data().email };
        const userName = user.name;

        const publicationsSnapshot = await db.collection('publicacoes').where('userId', '==', userId).get();

        const publications = publicationsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                usuario: data.usuario || userName,
                dataCriacao: data.dataCriacao ? data.dataCriacao.toDate() : null,
            };
        });

        res.status(200).json({
            user,
            publications,
            publicationsCount: publications.length,
        });
    } catch (error) {
        console.error("Erro ao buscar usuário e publicações:", error);
        res.status(500).json({ message: 'Erro ao buscar usuário e publicações', error: error.message });
    }
});

router.put('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { newName, newEmail, password } = req.body;

        // Verificar se o usuário existe com o ID do token
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

router.put('/:userId', adminAuthenticateToken, async (req, res) => { // Protegida
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

// Rota para buscar usuários pelo nome
router.get('/name/:name', async (req, res) => {
    try {
        const { name } = req.params;

        const snapshot = await db.collection('users').where('name', '>=', name).where('name', '<=', name + '\uf8ff').get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Nenhum usuário encontrado com esse nome!' });
        }

        const users = snapshot.docs.map(doc => {
            const { email } = doc.data();
            return { id: doc.id, name: doc.data().name, email };
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }
});

//rotas para manipular colecao amigos==============
// Rota para obter a quantidade de seguidores de um usuário
router.get('/:id/seguidores', async (req, res) => {
    try {
        const { id } = req.params;

        const seguidoresSnapshot = await db.collection('amigos').where('amigoId', '==', id).get();

        const quantidadeSeguidores = seguidoresSnapshot.size;

        res.status(200).json({ quantidadeSeguidores });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seguidores', error: error.message });
    }
});

// Rota para obter a quantidade de usuários que um usuário está seguindo
router.get('/:id/seguindo', async (req, res) => {
    try {
        const { id } = req.params;

        const seguindoSnapshot = await db.collection('amigos').where('usuarioId', '==', id).get();

        const quantidadeSeguindo = seguindoSnapshot.size;

        res.status(200).json({ quantidadeSeguindo });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seguindo', error: error.message });
    }
});

router.delete('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Deletar o usuário do Firebase Auth
        await admin.auth().deleteUser(userId);

        // Deletar o usuário do Firestore
        await db.collection('users').doc(userId).delete();

        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar usuário', error: error.message });
    }
});

// Rota para deletar um usuário (DELETE)
router.delete('/:id', adminAuthenticateToken, async (req, res) => { // Protegida
    try {
        const userId = req.params.id;

        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        // Opcional: Deletar posts, comentários, etc., associados a este usuário
        // Isso pode ser complexo e exige cuidado para não apagar dados errados.

        await userRef.delete();
        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar usuário', error: error.message });
    }
});

router.get('/img', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const userData = userDoc.data();
        const profileImageUrl = userData.profileImageUrl || 'https://www.gravatar.com/avatar/?d=mp&s=128'; // URL padrão se não houver imagem

        res.status(200).json({ profileImageUrl });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar imagem de perfil', error: error.message });
    }
});

router.get('/img/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        const userData = userDoc.data();
        const imageUrl = userData.imageUrl || 'https://www.gravatar.com/avatar/?d=mp&s=128'; // URL padrão se não houver imagem

        return res.status(200).json({ imageUrl });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar imagem de perfil', error: error.message });
    }
});

router.post('/img', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ message: 'URL da imagem de perfil é obrigatória.' });
        }

        const userRef = db.collection('users').doc(userId);
        await userRef.update({ imageUrl });

        res.status(200).json({ message: 'Imagem de perfil atualizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar imagem de perfil', error: error.message });
    }
});

export default router;