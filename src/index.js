const express = require('express')
const app = express()
const { Item, ItemSale, ItemOffer } = require('./models')
const routes = require('./routes')
const { initiateMongoose } = require('./database')
const { CONVERSION_RATES, convert } = require('./utils')

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
  await Promise.all(Object.keys(CONVERSION_RATES).map((currency) => {
    return ItemOffer.create({
      itemSale: itemSale._id,
      price: convert(itemSale.value)(currency)
    })
  }))
  res.send(itemSale)
})

const getOffersForActiveItemSale = async (itemId) => {
  const activeItemSale = await ItemSale.findOne({ item: itemId, endedAt: { $exists: false }})
  if (!activeItemSale) throw new Error('Item is not for sale') 
  return ItemOffer.find({ itemSale: activeItemSale._id}).populate('itemSale').exec()
}

app.put('/item-sale/end', async ({ body: { itemId } }, res) => {
  try {
    const activeItemOffers = await getOffersForActiveItemSale(itemId)
    await Promise.all(activeItemOffers.map((itemOffer) => {
      itemOffer.set('endedAt', new Date())
      return itemOffer.save()
    }))
    res.send(await ItemSale.findByIdAndUpdate(activeItemOffers[0].itemSale._id, { endedAt: new Date() }))
  } catch (error) {
    return res.status(400).send({ message: error.message })
  }
})

app.get('/item-sale/:itemId', async ({ params: { itemId } }, res) => {
  try {
    res.send(await getOffersForActiveItemSale(itemId))
  } catch (error) {
    return res.status(400).send({ message: error.message })
  }
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

