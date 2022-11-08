const express = require('express')
const app = express()
const { Item, ItemSale } = require('./models')
const routes = require('./routes')
const { initiateMongoose } = require('./database')

const PORT = 3000
const mongod = initiateMongoose()

app.use(express.json())

app.post('/item', async ({ body: { description, images } }, res) => {
  res.send(await Item.create({ description, images }))
})

app.get('/item/:id?', async ({ params: { id } }, res) => {
  res.send(await (id ? Item.findById(id) : Item.find({})))
})

app.post('/item-sale/start', async ({ body: { itemId, value } }, res) => {
  const item = await Item.findById(itemId)
  if (!item) return res.status(400).send({ message: `No such item (${itemId})` })
  const activeItemSale = await ItemSale.findOne({ item: item._id, endedAt: { $exists: false }})
  if (activeItemSale) return res.status(400).send({ message: `Item is already selling in sale (${activeItemSale._id})` })
  const itemSale = await ItemSale.create({
    item: item._id,
    value
  })
  res.send(itemSale)
})

app.put('/item-sale/end', async ({ body: { itemId } }, res) => {
  const activeItemSale = await ItemSale.findOne({ item: itemId, endedAt: { $exists: false }})
  if (!activeItemSale) return res.status(400).send({ message: `Item is not for sale` })
  activeItemSale.endedAt = new Date()
  await activeItemSale.save()
  res.send(activeItemSale)
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

