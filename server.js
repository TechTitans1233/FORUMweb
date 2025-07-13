// --------------------------------------
// Arquivo: server.js (com SDK cliente hardcoded)
// --------------------------------------
import express from 'express';
import admin from 'firebase-admin';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// --- configuração de __dirname em ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --------------------------------------
// Inicializar Admin SDK
// --------------------------------------
const serviceAccount = JSON.parse(
  readFileSync(
    resolve(__dirname, 'serviceAccountKey', 'projeto-pi2-firebase-adminsdk-phn8l-3bee21c2cb.json'),
    'utf8'
  )
);

// Verificação do conteúdo do serviceAccount
console.log("🔐 serviceAccount carregado:", {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://projeto-pi2.firebaseio.com'
});


// --------------------------------------
// Criar servidor Express
// --------------------------------------
const server = express();
server.use(express.json());
server.use(express.static(path.join(__dirname, 'public')));
server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Chave secreta para JWT - **MUITO IMPORTANTE: USE UMA VARIÁVEL DE AMBIENTE EM PRODUÇÃO**
const secretKey = 'UmaSENHASecretaEforte'; // Defina uma senha secreta para gerar o token

let revokedTokens = []; // Lista para armazenar tokens revogados

// Middleware para verificar tokens JWT personalizados
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    if (revokedTokens.includes(token)) {
        return res.status(403).json({ message: 'Token revogado. Faça login novamente.' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.log('Erro ao verificar token:', err.message);
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = decoded; // Decoded conterá os dados do payload (uid, email, role, name, etc.)
        next();
    });
};

// Middleware para cabeçalhos de segurança básicos
server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// --------------------------------------
// Inicializar Firestore
// --------------------------------------
const db = admin.firestore(); // Initialize Firestore

// --- criar uma demarcação (armazenando SÓ a string de coords) ---
server.post('/api/demarcacoes-coords', verificarToken, async (req, res) => { // Protegida
    const { titulo, conteudo, endereco, coordsString } = req.body;

    // validação básica
    if (![titulo, conteudo, endereco, coordsString].every(Boolean)) {
        return res
            .status(400)
            .json({ message: 'Campos obrigatórios: titulo, conteudo, endereco, coordsString.' });
    }

    try {
        const docRef = await db.collection('demarcacoes').add({
            titulo,
            conteudo,
            endereco,
            coordsString,  // permanece como texto puro
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ message: 'Demarcação salva com sucesso!', id: docRef.id });
    } catch (err) {
        console.error('Erro ao salvar demarcação:', err);
        res.status(500).json({ message: 'Erro interno ao salvar demarcação.' });
    }
});

// --- listar todas as demarcações ---
server.get('/api/demarcacoes-coords', async (req, res) => {
    try {
        const snapshot = await db
            .collection('demarcacoes')
            .orderBy('criadoEm', 'desc')
            .get();

        const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()          // inclui titulo, conteudo, endereco, coordsString, criadoEm
        }));
        res.json(lista);
    } catch (err) {
        console.error('Erro ao buscar demarcações:', err);
        res.status(500).json({ message: 'Erro interno ao buscar demarcações.' });
    }
});

// Rota única para criar usuário
server.post('/api/users', async (req, res) => {
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
        const userRecord = await admin.auth().createUser({ email, password });
        // **ATENÇÃO:** Armazenar senha no Firestore é uma PRÁTICA INSEGURA.
        // Em produção, NUNCA armazene senhas em texto plano ou reversível no Firestore.
        // O ideal é usar apenas o Firebase Authentication e não duplicar a senha aqui.
        await db.collection('users').doc(userRecord.uid).set({ name, email, password });
        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                name: name
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

// Rota para obter todos os usuários, ocultando a senha
server.get('/api/users', async (req, res) => {
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

// Rota para atualizar usuário com dados antigos e novos
server.put('/admin/usuarios/:userId', verificarToken, async (req, res) => { // Protegida
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

// Rota para deletar um usuário (DELETE)
server.delete('/api/users/:id', verificarToken, async (req, res) => { // Protegida
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

// --- Controle de Última Publicação para evitar duplicatas rápidas ---
const lastPublicationTimes = new Map(); // Mapa para userId -> último timestamp da publicação

// Rota para criar publicação
server.post('/api/publicacoes', verificarToken, async (req, res) => {
    try {
        // userId e userName agora vêm do token decodificado (req.user)
        const userId = req.user.uid;
        const userName = req.user.name; // O nome do usuário que criou a publicação

        const { endereco, titulo, conteudo, lat, lon, marcacao } = req.body;

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
server.get('/api/publicacoes', async (req, res) => {
    try {
        const snapshot = await db.collection('publicacoes').get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Nenhuma publicação encontrada!' });
        }

        const publicacoes = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const curtidasSnapshot = await db.collection('curtidas').where('publicacaoId', '==', doc.id).get();
            const curtidasCount = curtidasSnapshot.size;

            return {
                id: doc.id,
                ...data,
                curtidas: curtidasCount,
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
server.get('/api/publicacoes/:id', async (req, res) => {
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

// Rota para buscar as publicacoes de um usuario especifico.
server.get('/api/users/:userId/publications', verificarToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Adição: Verificar se o usuário logado tem permissão para ver essas publicações
        // Exemplo 1: Apenas o próprio usuário pode ver suas publicações
        if (req.user.uid !== userId) {
            // Exemplo 2: Se você quiser que admins também possam ver:
            // if (req.user.uid !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver as publicações deste usuário.' });
        }


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

// Rota para criar comentários
server.post('/api/comentarios', verificarToken, async (req, res) => { // Protegida
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

// Rota para buscar comentários de uma publicação
server.get('/api/publicacoes/:id/comentarios', async (req, res) => {
    const { id } = req.params;

    try {
        const comentariosSnapshot = await db.collection('comentarios').where('publicacaoId', '==', id).orderBy('dataCriacao', 'asc').get(); // Ordenado por data
        const comentarios = comentariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(comentarios);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        res.status(500).json({ message: 'Erro ao buscar comentários.' });
    }
});

// Rota para buscar um usuário pelo email e retornar nome, email e id
server.get('/api/users/email/:email', async (req, res) => {
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

//Rotas para editarADMIN
// Rota para editar um usuário (PUT) - Protegida
server.put('/api/users/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
        }

        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuário não encontrado!' });
        }

        await userRef.update({
            name,
            email,
        });

        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
    }
});

// Rota para editar uma publicação (PUT) - CONSOLIDADA - Protegida
server.put('/api/publicacoes/:id', verificarToken, async (req, res) => {
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

// Rota para buscar usuários pelo nome
server.get('/api/users/name/:name', async (req, res) => {
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

// Rota para criar uma relação de amizade (coleção amigos)
server.post('/api/amigos', verificarToken, async (req, res) => { // Protegida
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

//rotas para manipular colecao amigos==============
// Rota para obter a quantidade de seguidores de um usuário
server.get('/api/users/:id/seguidores', async (req, res) => {
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
server.get('/api/users/:id/seguindo', async (req, res) => {
    try {
        const { id } = req.params;

        const seguindoSnapshot = await db.collection('amigos').where('usuarioId', '==', id).get();

        const quantidadeSeguindo = seguindoSnapshot.size;

        res.status(200).json({ quantidadeSeguindo });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seguindo', error: error.message });
    }
});

// Função para limpar tokens expirados da lista de revogados
const limparTokensExpirados = () => {
    revokedTokens = revokedTokens.filter((token) => {
        try {
            jwt.verify(token, secretKey);
            return true;
        } catch (err) {
            return false;
        }
    });
};
// Limpa tokens expirados a cada minuto
setInterval(limparTokensExpirados, 60000);


// Rota protegida para validar token
server.post('/api/validate-token', verificarToken, (req, res) => {
    res.status(200).json({ message: 'Token válido.', user: req.user });
});

// Rota para login administrativo
server.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Senha administrativa é obrigatória!' });
    }

    if (password === 'suaSenhaAdministrativa') { // AINDA UMA SENHA HARDCODED, MUDE ISSO EM PRODUÇÃO
        const token = jwt.sign({ role: 'admin' }, secretKey, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Login administrativo realizado com sucesso!', token });
    } else {
        return res.status(403).json({ message: 'Senha administrativa incorreta.' });
    }
});

// Rota para login regular 
server.post('/api/login', async (req, res) => {
  // Log do payload recebido
  console.log('🔍 Payload recebido em /api/login:', req.body);

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios!' });
  }

  try {
    // 1) Apenas filtra por e-mail
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // 2) Verifica senha manualmente
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (userData.password !== password) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const uid = userDoc.id;
    const token = jwt.sign(
      { uid, email: userData.email, name: userData.name, role: 'user' },
      secretKey,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Usuário autenticado com sucesso!',
      uid,
      email: userData.email,
      name: userData.name,
      token
    });
  } catch (error) {
    // Log completo do erro para diagnóstico
    console.error('❌ Erro em POST /api/login:', error);
    console.error(error.stack);
    return res
      .status(500)
      .json({ message: 'Erro interno ao tentar login.', error: error.message });
  }
});


// Rota protegida para administradores
server.get('/api/admin/protected', verificarToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
    }
    res.status(200).json({ message: 'Você acessou uma rota protegida!', user: req.user });
});

// Rota para logout
server.post('/api/logout', verificarToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(400).json({ message: 'Token não fornecido.' });
    }

    if (revokedTokens.includes(token)) {
        return res.status(400).json({ message: 'Você já realizou logout.' });
    }

    revokedTokens.push(token);
    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

// Rotas que precisam de proteção com 'verificarToken' (já listadas, apenas para clareza)
// server.post('/api/demarcacoes-coords', verificarToken, async (req, res) => { /* ... */ });
// server.post('/api/publicacoes', verificarToken, async (req, res) => { /* ... */ });
// server.put('/api/publicacoes/:id', verificarToken, async (req, res) => { /* ... */ });
// server.delete('/api/publicacoes', verificarToken, async (req, res) => { /* ... */ });
// server.post('/api/comentarios', verificarToken, async (req, res) => { /* ... */ });
// server.post('/api/publicacoes/:id/curtir', verificarToken, async (req, res) => { /* ... */ });
// server.delete('/api/publicacoes/:id/descurtir', verificarToken, async (req, res) => { /* ... */ });
// server.post('/api/amigos', verificarToken, async (req, res) => { /* ... */ });
// server.post('/api/notificacoes', verificarToken, async (req, res) => { /* ... */ });


//rotas de curtidas
// Rota para curtir uma publicação - Protegida
server.post('/api/publicacoes/:id/curtir', verificarToken, async (req, res) => {
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
server.delete('/api/publicacoes/:id/descurtir', verificarToken, async (req, res) => {
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

//Rotas para notificacoes
// Rota para criar uma notificação - Protegida
server.post('/api/notificacoes', verificarToken, async (req, res) => {
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
server.get('/api/notificacoes/:usuarioId', verificarToken, async (req, res) => { // Protegida
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

// ROTA PARA EXCLUIR MÚLTIPLAS PUBLICAÇÕES DE UMA VEZ - Protegida
server.delete('/api/publicacoes', verificarToken, async (req, res) => {
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

// ROTA PARA VERIFICAR SE O EMAIL JA ESTA CADASTRADO.
server.get('/api/users/check-email/:email', async (req, res) => {
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

server.listen(3000, () => console.log('Servidor rodando na porta 3000'));