# Backend - Controle de Gastos (Login API)

## 🧑‍💻 Requisitos

- Node.js
- MySQL

## 🛠️ Instalação

1. Crie o banco:

```sql
CREATE DATABASE controle_gastos;
USE controle_gastos;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  senha VARCHAR(255) NOT NULL
);
```

2. Adicione um usuário teste:

```js
// No Node REPL ou script
const bcrypt = require('bcryptjs')
console.log(bcrypt.hashSync('123456', 10)) // copie o hash
```

```sql
INSERT INTO usuarios (email, senha) VALUES ('admin@admin.com', '<cole_o_hash_aqui>');
```

3. Instale as dependências:

```bash
cd backend
npm install express cors jsonwebtoken bcryptjs mysql2
```

4. Rode o servidor:

```bash
node server.cjs
```

> API disponível em http://localhost:3001/api/login
