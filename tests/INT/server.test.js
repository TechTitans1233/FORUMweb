import request from 'supertest';
import server from '../../server.js';

// Mock do Firebase Admin SDK para evitar chamadas reais ao Firestore
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mockedDocId' }),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: 'mockedDocId', data: () => ({ titulo: 'Teste', conteudo: 'Conteúdo', coordsString: '1,2', endereco: 'Rua Teste' }) }],
      }),
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ name: 'John', email: 'john@example.com' }),
        }),
        set: jest.fn().mockResolvedValue(),
        delete: jest.fn().mockResolvedValue(),
      })),
    })),
    firestore: {
      FieldValue: { serverTimestamp: jest.fn() },
    },
  };
  return {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn(() => mockFirestore),
    auth: jest.fn(() => ({
      createUser: jest.fn().mockResolvedValue({ uid: 'mockedUid', email: 'john@example.com' }),
    })),
  };
});

// Mock do Firebase Client SDK
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: { uid: 'mockedUid', email: 'test@example.com', displayName: 'Test User' },
  }),
}));

describe('Testes do Servidor Express', () => {
  afterAll(() => {
    server.close(); // Fecha o servidor após os testes
  });

  // Testes para POST /api/login
  describe('POST /api/login', () => {
    it('deve retornar 200 e um token ao fazer login com sucesso', async () => {
      const response = await request(server)
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Usuário autenticado com sucesso!');
    });

    it('deve retornar 400 se email ou senha estiverem faltando', async () => {
      const response = await request(server)
        .post('/api/login')
        .send({ email: 'test@example.com' }); // Sem senha

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Email e senha são obrigatórios!');
    });
  });

  // Testes para POST /api/users
  describe('POST /api/users', () => {
    it('deve criar um novo usuário e retornar 201', async () => {
      const response = await request(server)
        .post('/api/users')
        .send({ name: 'John Doe', email: 'john@example.com', password: 'password123' });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Usuário criado com sucesso!');
      expect(response.body.user).toHaveProperty('uid');
    });

    it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
      const response = await request(server)
        .post('/api/users')
        .send({ name: 'John Doe' }); // Sem email e senha

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Nome, email e senha são obrigatórios!');
    });
  });

  // Testes para POST /api/demarcacoes-coords
  describe('POST /api/demarcacoes-coords', () => {
    it('deve criar uma demarcação e retornar 200', async () => {
      const response = await request(server)
        .post('/api/demarcacoes-coords')
        .send({
          titulo: 'Teste',
          conteudo: 'Conteúdo de teste',
          endereco: 'Rua Teste',
          coordsString: '1,2',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Demarcação salva com sucesso!');
      expect(response.body).toHaveProperty('id');
    });

    it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
      const response = await request(server)
        .post('/api/demarcacoes-coords')
        .send({ titulo: 'Teste' }); // Sem conteudo, endereco e coordsString

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Campos obrigatórios: titulo, conteudo, endereco, coordsString.');
    });
  });

  // Testes para GET /api/demarcacoes-coords
  describe('GET /api/demarcacoes-coords', () => {
    it('deve listar todas as demarcações e retornar 200', async () => {
      const response = await request(server).get('/api/demarcacoes-coords');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
    });
  });
});