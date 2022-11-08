const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

const DB_NAME = 'DemoDB'

const initiateDb = async () => {
  const mongod = new MongoMemoryServer({
    instance: {
      dbName: DB_NAME,
      dbPath: 'data',
      storageEngine: 'wiredTiger'
    }
  })
  await mongod.start()
  return mongod
}

const initiateMongoose = async () => {
  const mongod = await initiateDb()
  const uri = mongod.getUri()
  await mongoose.connect(uri, { dbName: DB_NAME })
  console.log('Connected to db', uri)
  return mongod
}

const dropDb = async () => {
  const mongod = await initiateMongoose()
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongod.stop()
  console.log(`Database "${DB_NAME}" dropped`)
}

module.exports = {
  initiateDb,
  initiateMongoose,
  dropDb
}