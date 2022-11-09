const express = require('express')
const app = express()
const { Item, ItemSale, ItemOffer, Reservation } = require('./models')
const routes = require('./routes')
const { initiateMongoose } = require('./database')
const { CONVERSION_RATES, convert } = require('./utils')
const mongoose = require('mongoose')

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

app.put('/item-sale/end', async ({ body: { itemId } }, res) => {
  const activeItemSale = await ItemSale.findOne({ item: itemId, endedAt: { $exists: false }})
  if (!activeItemSale) return res.status(400).send({ message: 'Item is not for sale' })
  const activeItemOffers = await ItemOffer.find({ itemSale: activeItemSale._id})
  await Promise.all(activeItemOffers.map((itemOffer) => {
    itemOffer.set('endedAt', new Date())
    return itemOffer.save()
  }))
  activeItemSale.endedAt = new Date()
  res.send(await activeItemSale.save())
})

app.get('/item-sale/:itemId', async ({ params: { itemId } }, res) => {
  const activeItemSale = await ItemSale.findOne({ item: itemId, endedAt: { $exists: false }})
  if (!activeItemSale) return res.status(400).send({ message: 'Item is not for sale' })
  const activeItemOffers = await ItemOffer.find({ itemSale: activeItemSale._id}).populate('itemSale').exec()
  res.send(activeItemOffers)
})

app.get('/item-offer/:currency', async ({ params: { currency } }, res) => {
  res.send(await ItemOffer.find({ 'price.currency': currency, endedAt: { $exists: false } }))
})

app.post('/reservation/create', async ({ body: { cartId, itemOfferId } }, res) => {
  const itemOffer = await ItemOffer.findById(itemOfferId)
  if (!itemOffer) res.status(400).send({ message: 'No such ItemOffer' })
  const existingReservation = await Reservation.findOne({ itemOffer: itemOfferId, removedAt: { $exists: false }})
  if (existingReservation) {
    if (existingReservation.cartId === cartId) return existingReservation
    else return res.status(400).send({ message: 'Item is already reserved' })
  }
  res.send(await Reservation.create({
    itemOffer: itemOffer._id,
    cartId: cartId || new mongoose.Types.ObjectId()
  }))
})

app.get('/reservations/:cartId', async ({ params: { cartId } }, res) => {
  res.send(await Reservation.find({ cartId, removedAt: { $exists: false }}))
})

app.get('/cart/:cartId', async ({ params: { cartId } }, res) => {
  const reservations = await Reservation
    .find({ cartId, removedAt: { $exists: false }})
    .populate({
      path : 'itemOffer',
      populate : {
        path : 'itemSale',
        populate : {
          path : 'item'
        }
      }
    })
  const cartItems = reservations.map((reservation) => ({
    description: reservation.itemOffer.itemSale.item.description,
    images: reservation.itemOffer.itemSale.item.images,
    price: reservation.itemOffer.price
  }))
  res.send({
    items: cartItems,
    price: cartItems
      .map((item) => item.price)
      .reduce((totalPrice, price) => ({ amount: totalPrice.amount + price.amount, currency: totalPrice.currency }))
  })
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

