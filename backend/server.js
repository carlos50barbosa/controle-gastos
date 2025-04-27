import 'dotenv/config';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mysql from 'mysql2/promise'; // Usar a versão Promise
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Variáveis de conexão:');
console.log({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const app = express();
app.use(cors());
app.use(express.json());

// Criar a conexão com o banco de dados usando async
let db;
(async () => {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    console.log('✅ Conectado ao banco de dados');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
  }
})();

const SECRET = process.env.JWT_SECRET;

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

// Serve os arquivos estáticos do React
app.use(express.static(path.join(__dirname, 'public')));

// Para qualquer rota não-API, retorne o index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (results.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

    const usuario = results[0];
    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaCorreta) return res.status(401).json({ error: 'Dados inválidos' });

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// NOVA TRANSACAO
app.post('/api/transacoes', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;

  if (!descricao || !tipo || !valor || !data || !categoria) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const dataFormatada = data.includes("T") ? data.split("T")[0] : data;

  try {
    const [result] = await db.execute(
      'INSERT INTO transacoes (descricao, tipo, valor, data, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [descricao, tipo, valor, dataFormatada, categoria, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Erro ao salvar transação:', err.message);
    res.status(500).json({ error: 'Erro ao salvar transação.' });
  }
});

// LISTAR
app.get('/api/transacoes', autenticarToken, async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM transacoes WHERE usuario_id = ?', [req.user.id]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// DELETAR
app.delete('/api/transacoes/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute(
      'DELETE FROM transacoes WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transação não encontrada ou não pertence ao usuário.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao excluir transação:', err.message);
    res.status(500).json({ error: 'Erro ao excluir transação.' });
  }
});

// Atualizar transação
app.put('/api/transacoes/:id', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  const { id } = req.params;
  try {
    await db.execute(
      'UPDATE transacoes SET descricao=?, tipo=?, valor=?, data=?, categoria=? WHERE id=? AND usuario_id=?',
      [descricao, tipo, valor, data, categoria, id, req.user.id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// EXCLUSÃO EM MASSA
app.delete('/api/transacoes', autenticarToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação selecionada.' });
  }

  try {
    const [result] = await db.execute(
      'DELETE FROM transacoes WHERE id IN (?) AND usuario_id = ?',
      [ids, req.user.id]
    );
    res.json({ deletadas: result.affectedRows });
  } catch (err) {
    console.error('Erro ao excluir múltiplas transações:', err.message);
    res.status(500).json({ error: 'Erro ao excluir transações.' });
  }
});

app.listen(3001, () => {
  console.log('🚀 API rodando em http://localhost:3001');
});
