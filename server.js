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

// Rota para atualizar usuário com dados antigos e novos
server.put('/admin/usuarios/:userId', async (req, res) => {
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

      // Verificar se a senha fornecida corresponde à senha do banco de dados
      //if (userData.password !== password) {
        //  return res.status(400).json({ message: 'Senha incorreta!' });
      //}

      // Atualizar os dados do usuário
      await userRef.update({
          name: newName,
          email: newEmail,
      });

      // Atualizar o nome nas publicações
      const postsRef = db.collection('publicacoes').where('usuario', '==', userData.name);
      const postsSnapshot = await postsRef.get();
      const batch = db.batch();

      postsSnapshot.forEach(postDoc => {
          batch.update(postDoc.ref, { usuario: newName });
      });

      await batch.commit();

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

// Rota para criar publicação
server.post('/api/publicacoes', async (req, res) => {
  try {
      const { endereco, titulo, conteudo, lat, lon, usuario } = req.body;

      // Verificar campos obrigatórios
      if (!endereco || !titulo || !conteudo || !lat || !lon || !usuario) {
          return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
      }

      const novaPublicacao = {
          endereco,
          titulo,
          conteudo,
          lat,
          lon,
          usuario,  // Nome do usuário é armazenado aqui
          curtidas: 0, // Inicializa o número de curtidas como 0
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

// Rota para criar comentários
server.post('/api/comentarios', async (req, res) => {
  try {
      const { publicacaoId, comentario, usuario } = req.body;

      // Verificar campos obrigatórios
      if (!publicacaoId || !comentario || !usuario) {
          return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
      }

      // Verificar se o comentário não é vazio
      if (comentario.trim() === '') {
          return res.status(400).json({ message: 'O comentário não pode ser vazio.' });
      }

      const novoComentario = {
          publicacaoId,
          comentario,
          usuario,
          dataCriacao: admin.firestore.Timestamp.now(),  // Usando o Timestamp do Firestore para armazenar a data
      };

      // Adicionando o comentário no Firestore
      const docRef = await db.collection('comentarios').add(novoComentario);
      novoComentario.id = docRef.id;  // Adiciona o ID gerado do Firestore ao comentário

      res.status(201).json(novoComentario);  // Retorna o comentário com o ID gerado
  } catch (error) {
      console.error(error);  // Log de erro para ajudar a debugar
      res.status(500).json({ message: 'Erro ao criar comentário.' });
  }
});

// Rota para buscar comentários de uma publicação
server.get('/api/publicacoes/:id/comentarios', async (req, res) => {
  const { id } = req.params;

  try {
      const comentariosSnapshot = await db.collection('comentarios').where('publicacaoId', '==', id).get();
      const comentarios = comentariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.status(200).json(comentarios);
  } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).json({ message: 'Erro ao buscar comentários.' });
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
          const curtidasCount = curtidasSnapshot.size; // Conta o número de documentos na coleção de curtidas

          return {
              id: doc.id,
              ...data,
              curtidas: curtidasCount, // Adiciona o número de curtidas
              dataCriacao: data.dataCriacao ? data.dataCriacao.toDate() : null, // Converte o Timestamp para Date
          };
      }));

      res.status(200).json(publicacoes);
  } catch (error) {
      console.error(error); // Log de erro para ajudar a debugar
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

//Rota para buscar as publicacoes de um usuario especifico.
server.get('/api/users/email/:email/publications', async (req, res) => {
  try {
    const { email } = req.params;

    // Buscar o usuário no Firestore usando o email
    const userSnapshot = await db.collection('users').where('email', '==', email).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    const user = userSnapshot.docs.map(doc => {
      const { name, email } = doc.data(); // Extrair nome e email
      return { id: doc.id, name, email }; // Retornar apenas id, name e email
    })[0]; // Pegar o primeiro resultado

    // Buscar as publicações do usuário
    const publicationsSnapshot = await db.collection('publicacoes').where('userId', '==', user.id).get();

    const publications = publicationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao ? data.dataCriacao.toDate() : null, // Converte o Timestamp para Date
      };
    });

    // Retornar o usuário, publicações e a contagem de publicações
    res.status(200).json({
      user,
      publications,
      publicationsCount: publications.length, // Adiciona a contagem de publicações
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário e publicações', error: error.message });
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

// Rota para buscar um usuário pelo email e retornar nome, email e id
server.get('/api/users/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Buscar o usuário no Firestore usando o email
    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    const user = snapshot.docs.map(doc => {
      const { name, email } = doc.data(); // Extrair nome e email
      return { id: doc.id, name, email }; // Retornar apenas id, name e email
    })[0];  // Como o email é único, podemos pegar o primeiro resultado

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
});
//Rotas para editarADMIN
// Rota para editar um usuário (PUT)
server.put('/api/users/:id', async (req, res) => {
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
// Rota para editar uma publicação (PUT)
server.put('/api/publicacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { endereco, titulo, conteudo, marcacao, lat, lon } = req.body;

    if (!endereco || !titulo || !conteudo || !lat || !lon) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }

    const publicacaoRef = db.collection('publicacoes').doc(id);
    const publicacaoDoc = await publicacaoRef.get();

    if (!publicacaoDoc.exists) {
      return res.status(404).json({ message: 'Publicação não encontrada!' });
    }

    await publicacaoRef.update({
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

// Rota para buscar usuários pelo nome
server.get('/api/users/name/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Buscar usuários no Firestore usando o nome
    const snapshot = await db.collection('users').where('name', '>=', name).where('name', '<=', name + '\uf8ff').get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Nenhum usuário encontrado com esse nome!' });
    }

    const users = snapshot.docs.map(doc => {
      const { email } = doc.data(); // Extrair email
      return { id: doc.id, name: doc.data().name, email }; // Retornar apenas id, name e email
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
});

// Rota para criar uma relação de amizade( colecao amigos )
server.post('/api/amigos', async (req, res) => {
  try {
    const { usuarioId, amigoId } = req.body;

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

//rotas para manipular colecao amigos
// Rota para obter a quantidade de seguidores de um usuário
server.get('/api/users/:id/seguidores', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar todas as relações de amizade onde o amigo é o usuário
    const seguidoresSnapshot = await db.collection('amigos').where('amigoId', '==', id).get();

    const quantidadeSeguidores = seguidoresSnapshot.size; // Conta o número de documentos

    res.status(200).json({ quantidadeSeguidores });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar seguidores', error: error.message });
  }
});
// Rota para obter a quantidade de usuários que um usuário está seguindo
server.get('/api/users/:id/seguindo', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar todas as relações de amizade onde o usuário é o que está seguindo
    const seguindoSnapshot = await db.collection('amigos').where('usuarioId', '==', id).get();

    const quantidadeSeguindo = seguindoSnapshot.size; // Conta o número de documentos

    res.status(200).json({ quantidadeSeguindo });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar seguindo', error: error.message });
  }
});



import jwt from 'jsonwebtoken';
const secretKey = 'UmaSENHA'; // Defina uma senha secreta para gerar o token

// Rota para login administrativo
server.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    // Verifique a senha administrativa
    if (password === 'suaSenhaAdministrativa') {
        // Gera um token
        const token = jwt.sign({ role: 'admin' }, secretKey, { expiresIn: '1h' }); // O token expira em 1 hora
        return res.status(200).json({ message: 'Login administrativo realizado com sucesso!', token });
    } else {
        return res.status(403).json({ message: 'Senha administrativa incorreta.' });
    }
});

// Middleware para verificar o token
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Obtém o token do cabeçalho

  if (!token) {
      return res.status(401).json({ message: 'Token não fornecido.' }); // 401 Unauthorized
  }

  jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
          return res.status(403).json({ message: 'Token inválido.' }); // 403 Forbidden
      }
      req.user = decoded; // Armazena os dados decodificados do token na requisição
      next(); // Chama a próxima função de middleware
  });
};

// Exemplo de rota protegida
server.get('/api/admin/protected', verificarToken, (req, res) => {
    res.status(200).json({ message: 'Você acessou uma rota protegida!', user: req.user });
});


//rotas de curtidas
// Rota para curtir uma publicação
server.post('/api/publicacoes/:id/curtir', async (req, res) => {
  try {
    const { userId } = req.body; // O ID do usuário que está curtindo
    const publicacaoId = req.params.id; // O ID da publicação a ser curtida

    // Verificar se a curtida já existe
    const curtidaExistente = await db.collection('curtidas')
      .where('publicacaoId', '==', publicacaoId)
      .where('userId', '==', userId)
      .get();

    if (!curtidaExistente.empty) {
      return res.status(400).json({ message: 'Você já curtiu esta publicação.' });
    }

    // Adicionar a nova curtida
    await db.collection('curtidas').add({
      publicacaoId,
      userId,
      dataCriacao: admin.firestore.Timestamp.now(),
    });

    // Atualizar o contador de curtidas na publicação
    const publicacaoRef = db.collection('publicacoes').doc(publicacaoId);
    await publicacaoRef.update({
      curtidas: admin.firestore.FieldValue.increment(1), // Incrementa o contador de curtidas
    });

    res.status(201).json({ message: 'Publicação curtida com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao curtir a publicação', error: error.message });
  }
});

// Rota para descurtir uma publicação
server.delete('/api/publicacoes/:id/descurtir', async (req, res) => {
  try {
    const { userId } = req.body; // O ID do usuário que está descurtindo
    const publicacaoId = req.params.id; // O ID da publicação a ser descurtida

    // Verificar se a curtida existe
    const curtidaExistente = await db.collection('curtidas')
      .where('publicacaoId', '==', publicacaoId)
      .where('userId', '==', userId)
      .get();

    if (curtidaExistente.empty) {
      return res.status(400).json({ message: 'Você ainda não curtiu esta publicação.' });
    }

    // Remover a curtida
    const curtidaId = curtidaExistente.docs[0].id; // Pega o ID da curtida existente
    await db.collection('curtidas').doc(curtidaId).delete();

    // Atualizar o contador de curtidas na publicação
    const publicacaoRef = db.collection('publicacoes').doc(publicacaoId);
    await publicacaoRef.update({
      curtidas: admin.firestore.FieldValue.increment(-1), // Decrementa o contador de curtidas
    });

    res.status(200).json({ message: 'Publicação descurtida com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao descurtir a publicação', error: error.message });
  }
});

//Rotas para notificacoes
// Rota para criar uma notificação
server.post('/api/notificacoes', async (req, res) => {
  try {
    const { usuarioId, mensagem } = req.body;

    // Verificar campos obrigatórios
    if (!usuarioId || !mensagem) {
      return res.status(400).json({ message: 'Usuário ID e mensagem são obrigatórios.' });
    }

    const novaNotificacao = {
      usuarioId,
      mensagem,
      dataCriacao: admin.firestore.Timestamp.now(), // Usando o Timestamp do Firestore para armazenar a data
    };

    // Adicionando a notificação no Firestore
    const docRef = await db.collection('notificacoes').add(novaNotificacao);
    novaNotificacao.id = docRef.id; // Adiciona o ID gerado do Firestore à notificação

    res.status(201).json(novaNotificacao); // Retorna a notificação com o ID gerado
  } catch (error) {
    console.error(error); // Log de erro para ajudar a debugar
    res.status(500).json({ message: 'Erro ao criar notificação.' });
  }
});
// Rota para buscar notificações de um usuário
server.get('/api/notificacoes/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const notificacoesSnapshot = await db.collection('notificacoes').where('usuarioId', '==', usuarioId).orderBy('dataCriacao', 'desc').get();
    const notificacoes = notificacoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(notificacoes);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ message: 'Erro ao buscar notificações.' });
  }
});

server.listen(3000, () => {
  console.log('Servidor Express rodando na porta 3000');
});
