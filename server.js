import { v4 as uuidv4 } from 'uuid';
import { initializeApp } from 'firebase/app';
import express from 'express';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';  

// Caminho para o arquivo JSON de credenciais do Firebase Admin
const serviceAccountPath = path.resolve('projeto-pi2-firebase-adminsdk-phn8l-3380c640f9.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Inicializar o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://projeto-pi2.firebaseio.com',
});

// Configuração do Firebase Client SDK
const firebaseConfig = {
  apiKey: "AIzaSyBKXHZcr5gQ04qwm22HDur9sINyd_cg6_c", 
  authDomain: "projeto-pi2.firebaseapp.com", 
  projectId: "projeto-pi2", 
  storageBucket: "projeto-pi2.appspot.com", 
  messagingSenderId: "112085181246", 
  appId: "1:112085181246:web:efdfa38d6d8815e7f0826f"
};

initializeApp(firebaseConfig);
const auth = getAuth(); // Inicializando o Firebase Authentication

// Instância do Firestore
const db = admin.firestore();
const server = express();

// Serve arquivos estáticos da pasta 'public'
server.use(express.static(path.join(path.resolve(), 'public')));

// Middleware para parsing de JSON
server.use(bodyParser.json());

// Middleware para cabeçalhos de segurança básicos
server.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Rota para criar documento (CREATE) sem hash de senha
server.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios!' });
    }

    // Criar o usuário com Firebase Authentication (sem hash de senha)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Salvar os dados do usuário no Firestore (sem senha)
    await db.collection('users').add({
      name,
      email,
      uid: user.uid,
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: {
        uid: user.uid,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
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

// Rota para atualizar um usuário (UPDATE)
server.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, password } = req.body;

    if (!name && !email && !password) {
      return res.status(400).json({ message: 'É necessário pelo menos um campo para atualizar!' });
    }

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.password = password; // Não aplica hash, armazena diretamente

    await userRef.update(updates);
    res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
});

// Rota para deletar um usuário (DELETE)
server.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    await userRef.delete();
    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar usuário', error: error.message });
  }
});

// Rota para login (POST)
server.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios!' });
    }

    // Autenticar o usuário com Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const user = userCredential.user;
    const token = await user.getIdToken();  // Gera o token de autenticação para o usuário

    res.status(200).json({
      message: 'Usuário autenticado com sucesso!',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao autenticar usuário', error: error.message });
  }
});

server.post('/api/publicacoes', async (req, res) => {
    try {
      const { endereco, titulo, conteudo, marcacao, lat, lon } = req.body;
  
      // Verificar campos obrigatórios
      if (!endereco || !titulo || !conteudo || !lat || !lon) {
        return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
      }
  
      const novaPublicacao = {
        endereco,
        titulo,
        conteudo,
        marcacao,
        lat,
        lon,
        usuario: 'Usuário Desconhecido', // Este valor pode ser alterado para capturar o usuário logado
        dataCriacao: admin.firestore.Timestamp.now(),  // Usando o Timestamp do Firestore para armazenar a data
      };
  
      // Adicionando a publicação no Firestore
      const docRef = await db.collection('publicacoes').add(novaPublicacao);
      novaPublicacao.id = docRef.id;  // Adiciona o ID gerado do Firestore à publicação
  
      res.status(201).json(novaPublicacao);  // Retorna a publicação com o ID gerado
    } catch (error) {
      console.error(error);  // Log de erro para ajudar a debugar
      res.status(500).json({ message: 'Erro ao criar publicação.' });
    }
});

// Rota para obter todas as publicações (GET)
server.get('/api/publicacoes', async (req, res) => {
  try {
    const snapshot = await db.collection('publicacoes').get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'Nenhuma publicação encontrada!' });
    }

    const publicacoes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao ? data.dataCriacao.toDate() : null, // Converte o Timestamp para Date
      };
    });

    res.status(200).json(publicacoes);
  } catch (error) {
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

// Rota para atualizar uma publicação (PUT)
server.put('/api/publicacoes/:id', async (req, res) => {
  try {
    const { endereco, titulo, conteudo, marcacao, lat, lon } = req.body;

    if (!endereco || !titulo || !conteudo || !marcacao || !lat || !lon) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }

    await db.collection('publicacoes').doc(req.params.id).update({
      endereco,
      titulo,
      conteudo,
      marcacao,
      lat,
      lon,
    });

    res.status(200).json({ message: 'Publicação atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar publicação', error: error.message });
  }
});

// Rota para deletar uma publicação (DELETE)
server.delete('/api/publicacoes/:id', async (req, res) => {
  try {
    const doc = await db.collection('publicacoes').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Publicação não encontrada!' });
    }

    await db.collection('publicacoes').doc(req.params.id).delete();
    res.status(200).json({ message: 'Publicação deletada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar publicação', error: error.message });
  }
});

server.listen(3000, () => {
  console.log('Servidor Express rodando na porta 3000');
});
