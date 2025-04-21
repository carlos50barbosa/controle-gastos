require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'controle_gastos'
});

db.connect((err) => {
  if (err) {
    return console.error('Erro ao conectar no MySQL:', err.message);
  }

  console.log('Conectado com sucesso! Inserindo dados...');

  const usuarioId = 6;

  const transacoes = [
    ['Salário', 'receita', 3000, '2025-04-01', 'Outros'],
    ['Almoço', 'despesa', 35, '2025-04-02', 'Alimentação'],
    ['Uber', 'despesa', 22, '2025-04-03', 'Transporte'],
    ['Farmácia', 'despesa', 55, '2025-04-04', 'Saúde'],
    ['Cinema', 'despesa', 40, '2025-04-05', 'Lazer'],
    ['Supermercado', 'despesa', 120, '2025-04-06', 'Alimentação'],
  ];

  transacoes.forEach(([descricao, tipo, valor, data, categoria]) => {
    db.query(
      'INSERT INTO transacoes (descricao, tipo, valor, data, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [descricao, tipo, valor, data, categoria, usuarioId],
      (err) => {
        if (err) console.error('Erro ao inserir:', err.message);
      }
    );
  });

  db.end(() => {
    console.log('Transações inseridas e conexão encerrada.');
  });
});
