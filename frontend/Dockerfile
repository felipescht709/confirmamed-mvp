FROM node:20

WORKDIR /home/node/app

# Copia apenas os arquivos de dependência primeiro (cache do Docker)
COPY package*.json ./

RUN npm install

# Copia o restante dos arquivos
COPY . .

EXPOSE 5173

# O host 0.0.0.0 é vital para o Vite ser acessível de fora do container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]