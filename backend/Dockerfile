FROM node:22-slim

# Cria o diretório de trabalho
WORKDIR /home/node/app

# Copia apenas o necessário para instalar dependências (otimiza cache)
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do backend
COPY . .

# Expõe a porta que definimos no server.js
EXPOSE 4000

# O segredo: Roda as migrations e inicia o servidor
CMD ["sh", "-c", "npx knex migrate:latest && npm run dev"]