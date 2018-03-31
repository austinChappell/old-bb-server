const dbConfig = process.env.NODE_ENV === 'development' ? {} : {
  connectionString: process.env.DATABASE_URL,
  ssl: true,
}

module.exports = {
  dbConfig
}
