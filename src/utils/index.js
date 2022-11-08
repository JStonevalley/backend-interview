const CONVERSION_RATES = {
  SEK: {
    EUR: 0.1,
    DKK: 0.7,
  },
  EUR: {
    SEK: 1 / 0.1,
    DKK: 1 / 0.13,
  },
  DKK: {
    SEK: 1 / 0.7,
    EUR: 0.13,
  }
}

const convert = ({ amount, currency }) => (toCurrency) => {
  if (!amount || !currency) throw new Error('value and currency is required for conversion')
  if (currency === toCurrency) return { amount, currency }
  const rate = CONVERSION_RATES[currency]?.[toCurrency]
  if (!rate) throw new Error('Non-supported currency')
  return { amount: Math.round(amount * rate * 100) / 100, currency: toCurrency }
}

module.exports = {
  convert,
  CONVERSION_RATES
}