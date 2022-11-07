const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const express = require('express')
const app = express()
const { Item } = require('./models')
const routes = require('./routes')

const DB_NAME = 'DemoDB'
const PORT = 3000
let mongod 

const initiateDb = async () => {
  mongod = new MongoMemoryServer({
    instance: {
      dbName: DB_NAME,
      dbPath: 'data',
      storageEngine: 'wiredTiger'
    }
  })
  await mongod.start()

  const uri = mongod.getUri()
  await mongoose.connect(uri, { dbName: DB_NAME })
  console.log('Connected to db', uri)
}

initiateDb()

app.use(express.json())

app.post('/item', async ({ body: { description, images } }, res) => {
  res.send(await Item.create({ description, images }))
})

app.get('/item/:id?', async ({ params: { id } }, res) => {
  res.send(await (id ? Item.findById(id) : Item.find({})))
})

routes(app)

const server = app.listen(PORT, () => console.log(`App listening on port ${PORT}!`))
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.')
  console.log('Closing http server.')
  server.close(async (err) => {
    console.log('server closed')
    await mongod.stop()
    process.exit(err ? 1 : 0)
  })
})

