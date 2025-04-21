const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'The379280@!', // ajuste aqui
  database: 'controle_gastos'
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar:', err.message);
  } else {
    console.log('Conexão bem-sucedida!');
  }
  db.end();
});
