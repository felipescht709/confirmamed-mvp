const bcrypt = require('bcryptjs');
const knex = require('./src/database/db'); // Ajuste o caminho se necessário

async function reset() {
  const novoHash = await bcrypt.hash('123456', 10);
  console.log('Novo Hash gerado:', novoHash);
  
  await knex('USUARIOS_SISTEMA')
    .where({ email: 'admin@confirmamed.com' })
    .update({ senha_hash: novoHash });
    
  console.log('Senha do Admin atualizada com sucesso!');
  process.exit();
}

reset();