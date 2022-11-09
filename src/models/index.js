const { model, Schema } = require('mongoose')

const itemSchema = new Schema({
  description: String,
  images: [String]
})

const itemSaleSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: 'Item' },
  value: {
    amount: Number,
    currency: String
  },
  endedAt: Date
})

const itemOfferSchema = new Schema({
  itemSale: { type: Schema.Types.ObjectId, ref: 'ItemSale' },
  price: {
    amount: Number,
    currency: String
  },
  endedAt: Date
})

const reservationSchema = new Schema({
  itemOffer: { type: Schema.Types.ObjectId, ref: 'ItemOffer' },
  removedAt: Date,
  cartId: String
})


module.exports = {
  Item: model('Item', itemSchema),
  ItemSale: model('ItemSale', itemSaleSchema),
  ItemOffer: model('ItemOffer', itemOfferSchema),
  Reservation: model('Reservation', reservationSchema)
}