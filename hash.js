const bcrypt = require('bcryptjs'); // ou 'bcrypt' dependendo do seu package.json
bcrypt.hash('123456', 10).then(hash => console.log(hash));