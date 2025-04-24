require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

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

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});


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

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

    const usuario = results[0];
    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaCorreta) return res.status(401).json({ error: 'Dados inválidos' });

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// NOVA TRANSACAO
app.post('/api/transacoes', autenticarToken, (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;

  if (!descricao || !tipo || !valor || !data || !categoria) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const dataFormatada = data.includes("T") ? data.split("T")[0] : data;

  db.query(
    'INSERT INTO transacoes (descricao, tipo, valor, data, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [descricao, tipo, valor, dataFormatada, categoria, req.user.id],
    (err, result) => {
      if (err) {
        console.error('Erro ao salvar transação:', err.message);
        return res.status(500).json({ error: 'Erro ao salvar transação.' });
      }
      res.status(201).json({ id: result.insertId });
    }
  );
});

// LISTAR
app.get('/api/transacoes', autenticarToken, (req, res) => {
  db.query('SELECT * FROM transacoes WHERE usuario_id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar transações' });
    res.json(results);
  });
});



// DELETAR
app.delete('/api/transacoes/:id', autenticarToken, (req, res) => {
  const { id } = req.params;
  db.query(
    'DELETE FROM transacoes WHERE id = ? AND usuario_id = ?',
    [id, req.user.id],
    (err, result) => {
      if (err) {
        console.error('Erro ao excluir transação:', err.message);
        return res.status(500).json({ error: 'Erro ao excluir transação.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transação não encontrada ou não pertence ao usuário.' });
      }
      res.sendStatus(204);
    }
  );
});

// Atualizar transação
app.put('/api/transacoes/:id', autenticarToken, (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  const { id } = req.params;
  db.query(
    'UPDATE transacoes SET descricao=?, tipo=?, valor=?, data=?, categoria=? WHERE id=? AND usuario_id=?',
    [descricao, tipo, valor, data, categoria, id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar transação' });
      res.sendStatus(204);
    }
  );
});

// EXCLUSAO EM MASSA
app.delete('/api/transacoes', autenticarToken, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação selecionada.' });
  }

  db.query(
    'DELETE FROM transacoes WHERE id IN (?) AND usuario_id = ?',
    [ids, req.user.id],
    (err, result) => {
      if (err) {
        console.error('Erro ao excluir múltiplas transações:', err.message);
        return res.status(500).json({ error: 'Erro ao excluir transações.' });
      }
      res.json({ deletadas: result.affectedRows });
    }
  );
});

app.listen(3001, () => {
  console.log('API rodando em http://localhost:3001');
});
