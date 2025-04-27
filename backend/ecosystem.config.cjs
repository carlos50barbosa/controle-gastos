// backend/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name:   'controle-gastos',
      script: './server.js',
      cwd:    __dirname,
      watch:  false,
      env: {
        DB_HOST: 'localhost',
        DB_USER: 'root',
        DB_PASS: 'The379280@!',
        DB_NAME: 'controle_gastos',
        NODE_ENV: 'production'
      }
    }
  ]
};
