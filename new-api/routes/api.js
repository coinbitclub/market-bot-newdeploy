const express = require('express');
const router = express.Router();

// Rota GET para listar todos os itens
router.get('/', (req, res) => {
  res.json({
    message: 'API Routes funcionando!',
    endpoints: [
      'GET /api - Lista endpoints disponíveis',
      'GET /api/users - Lista usuários',
      'POST /api/users - Cria novo usuário',
      'GET /api/users/:id - Busca usuário por ID'
    ]
  });
});

// Simulação de dados de usuários
let users = [
  { id: 1, name: 'João Silva', email: 'joao@email.com', createdAt: new Date() },
  { id: 2, name: 'Maria Santos', email: 'maria@email.com', createdAt: new Date() }
];

// GET - Listar usuários
router.get('/users', (req, res) => {
  res.json({
    success: true,
    data: users,
    total: users.length
  });
});

// GET - Buscar usuário por ID
router.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

// POST - Criar novo usuário
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Nome e email são obrigatórios'
    });
  }
  
  const newUser = {
    id: users.length + 1,
    name,
    email,
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: newUser
  });
});

// PUT - Atualizar usuário
router.put('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }
  
  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    email: email || users[userIndex].email,
    updatedAt: new Date()
  };
  
  res.json({
    success: true,
    message: 'Usuário atualizado com sucesso',
    data: users[userIndex]
  });
});

// DELETE - Remover usuário
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }
  
  users.splice(userIndex, 1);
  
  res.json({
    success: true,
    message: 'Usuário removido com sucesso'
  });
});

module.exports = router;