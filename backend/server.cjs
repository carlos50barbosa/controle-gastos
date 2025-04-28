const path = require('path');

// força carregar o .env que está na mesma pasta de server.cjs
const result = require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});
if (result.error) {
  console.error('❌ Falha ao ler .env:', result.error);
  process.exit(1);
}

// Diagnóstico rápido:
console.log('🔍 Variáveis de conexão:', {
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// usa pool em vez de conexão simples
const mysql = require('mysql2/promise');
const pool  = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASS,
  database:        process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit:      0
});

// testa a conexão
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Conectado ao banco de dados');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
})();

// …o resto do seu código continua aqui, usando pool.execute() em vez de db.execute()


// JWT Secret
const SECRET = process.env.JWT_SECRET;
if (!SECRET) console.warn('⚠️ JWT_SECRET não definido em .env');

// Middleware de autenticação JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [users] = await pool.execute(
      'SELECT id, email, senha FROM usuarios WHERE email = ?',
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const user = users[0];
    if (!bcrypt.compareSync(senha, user.senha)) {
      return res.status(401).json({ error: 'Dados inválidos' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('❌ Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// CRIAÇÃO DE TRANSAÇÃO
app.post('/api/transacoes', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  if (!descricao || !tipo || !valor || !data || !categoria) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  const dataFormatada = data.split('T')[0];
  try {
    const [result] = await pool.execute(
      'INSERT INTO transacoes (descricao, tipo, valor, data, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [descricao, tipo, valor, dataFormatada, categoria, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('❌ Erro ao criar transação:', err);
    res.status(500).json({ error: 'Erro ao salvar transação.' });
  }
});

// LISTAR TRANSAÇÕES
app.get('/api/transacoes', autenticarToken, async (req, res) => {
  try {
    const [results] = await pool.execute(
      'SELECT * FROM transacoes WHERE usuario_id = ?',
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ Erro ao listar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações.' });
  }
});

// ATUALIZAR TRANSAÇÃO
app.put('/api/transacoes/:id', autenticarToken, async (req, res) => {
  const { descricao, tipo, valor, data, categoria } = req.body;
  const { id } = req.params;
  try {
    await pool.execute(
      'UPDATE transacoes SET descricao=?, tipo=?, valor=?, data=?, categoria=? WHERE id=? AND usuario_id=?',
      [descricao, tipo, valor, data.split('T')[0], categoria, id, req.user.id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erro ao atualizar transação:', err);
    res.status(500).json({ error: 'Erro ao atualizar transação.' });
  }
});

// DELETAR TRANSAÇÃO ÚNICA
app.delete('/api/transacoes/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      'DELETE FROM transacoes WHERE id=? AND usuario_id=?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erro ao deletar transação:', err);
    res.status(500).json({ error: 'Erro ao excluir transação.' });
  }
});

// EXCLUSÃO EM MASSA
app.delete('/api/transacoes', autenticarToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação selecionada.' });
  }
  try {
    const [result] = await pool.execute(
      'DELETE FROM transacoes WHERE id IN (?) AND usuario_id=?',
      [ids, req.user.id]
    );
    res.json({ deletadas: result.affectedRows });
  } catch (err) {
    console.error('❌ Erro ao excluir transações em massa:', err);
    res.status(500).json({ error: 'Erro ao excluir transações.' });
  }
});

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor apenas no localhost
const PORT = process.env.PORT || 3001;
const HOST = '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`🚀 API rodando em http://${HOST}:${PORT}`);
});
