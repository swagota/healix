const { Pool, types } = require("pg");

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1083, (value) => value);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

module.exports = pool;
