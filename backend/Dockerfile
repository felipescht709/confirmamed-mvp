FROM node:22-slim

# Cria o diretório de trabalho e define permissões
WORKDIR /home/node/app
RUN chown -R node:node /home/node/app

# Muda para o usuário não-privilegiado node
USER node

# Copia apenas o necessário para instalar dependências (otimiza cache)
COPY --chown=node:node package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do backend
COPY --chown=node:node . .

# Expõe a porta que definimos no server.js
EXPOSE 4000

# O segredo: Roda as migrations e inicia o servidor
CMD ["sh", "-c", "npx knex migrate:latest && npm run dev"]