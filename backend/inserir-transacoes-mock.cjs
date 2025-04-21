const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // ajuste se necessário
  database: 'controle_gastos'
});

// Substitua pelo ID do usuário existente (ex: 1 ou 2)
const usuarioId = 1;

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
      if (err) console.error('Erro:', err.message);
    }
  );
});

console.log('Transações inseridas!');
db.end();
