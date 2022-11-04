const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const express = require('express')
const app = express()
const crypto = require('crypto')
const { Item } = require('./models')
const routes = require('./routes')

const PORT = 3000

const initiateDb = async () => {
  const mongod = await MongoMemoryServer.create()

  const uri = mongod.getUri()
  await mongoose.connect(uri, { dbName: 'DemoDB' })
  console.log('Connected to db', uri)
  await createInitialData()
}

const createInitialData = async () => {

  await Promise.all([
    Item.create({ description: 'A very nice button-down shirt', images: [`http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`, `http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`] }),
    Item.create({ description: 'A pair of pants', images: [`http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`, `http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`] }),
    Item.create({ description: 'This is a dress', images: [`http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`, `http://example.image-${crypto.randomBytes(4).toString('hex')}.jpg`] })
  ])
  console.log('Finished creating initial data')
}

initiateDb()

app.use(express.json())
app.get('/', (req, res) => {
  res.send('Hello World')
})

app.post('/item', async ({ body: { description, images } }, res) => {
  res.send(await Item.create({ description, images }))
})

app.get('/item/:id?', async ({ params: { id } }, res) => {
  res.send(await (id ? Item.findById(id) : Item.find({})))
})

routes(app)

app.listen(PORT, () => console.log(`App listening on port ${PORT}!`))
