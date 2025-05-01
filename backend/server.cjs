// backend/server.cjs
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const PORT   = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET;

// 1) Imprime variáveis de conexão
console.log('🔍 Variáveis de conexão:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// 2) Configura Express
const app = express();
app.use(cors());
app.use(express.json());

// 3) Conecta ao MySQL
let db;
(async () => {
  try {
    db = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    console.log('✅ Conectado ao banco de dados');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
})();

// 4) Middleware de JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 5) Serve o React build
app.use(express.static(path.join(__dirname, 'public')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) Rotas da API

// Health
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// Login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT id, email, senha FROM usuarios WHERE email = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
    const user = rows[0];
    if (!bcrypt.compareSync(senha, user.senha)) {
      return res.status(401).json({ error: 'Dados inválidos' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('❌ Erro no login:', err.message);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Cria transação
app.post('/api/transacoes', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  if (!descricao || !tipo || !valor || !data || !categoria) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  const dataFormatada = data.split('T')[0];
  try {
    const [result] = await db.execute(
      'INSERT INTO transacoes (descricao, tipo, valor, data, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [descricao, tipo, valor, dataFormatada, categoria, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('❌ Erro ao salvar transação:', err.message);
    res.status(500).json({ error: 'Erro ao salvar transação.' });
  }
});

// Lista transações
app.get('/api/transacoes', autenticarToken, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT * FROM transacoes WHERE usuario_id = ?',
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ Erro ao buscar transações:', err.message);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// Exclui transação
app.delete('/api/transacoes/:id', autenticarToken, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM transacoes WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erro ao excluir transação:', err.message);
    res.status(500).json({ error: 'Erro ao excluir transação.' });
  }
});

// Atualiza transação
app.put('/api/transacoes/:id', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  try {
    await db.execute(
      'UPDATE transacoes SET descricao=?, tipo=?, valor=?, data=?, categoria=? WHERE id=? AND usuario_id=?',
      [descricao, tipo, valor, data.split('T')[0], categoria, req.params.id, req.user.id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erro ao atualizar transação:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// Exclusão em massa (com placeholders dinâmicos)
app.delete('/api/transacoes', autenticarToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação selecionada.' });
  }
  // Monta placeholders conforme número de ids
  const placeholders = ids.map(() => '?').join(',');
  try {
    const [result] = await db.execute(
      `DELETE FROM transacoes WHERE id IN (${placeholders}) AND usuario_id = ?`,
      [...ids, req.user.id]
    );
    res.json({ deletadas: result.affectedRows });
  } catch (err) {
    console.error('❌ Erro ao excluir múltiplas transações:', err.message);
    res.status(500).json({ error: 'Erro ao excluir transações.' });
  }
});

// 7) Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
