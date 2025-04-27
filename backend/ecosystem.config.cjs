// backend/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'controle-gastos',
    script: './server.cjs',
    cwd: __dirname,
    // NÃO coloque aqui DB_PASS, JWT_SECRET etc.
    env: {
      NODE_ENV: 'production'
    }
  }]
}
