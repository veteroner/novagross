import Iyzipay from 'iyzipay'

// iyzico client configuration
const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL!
})

export default iyzipay

// Types
export interface IyzicoAddress {
  contactName: string
  city: string
  country: string
  address: string
  zipCode?: string
}

export interface IyzicoBasketItem {
  id: string
  name: string
  category1: string
  category2?: string
  itemType: 'PHYSICAL' | 'VIRTUAL'
  price: string
}

export interface IyzicoBuyer {
  id: string
  name: string
  surname: string
  gsmNumber: string
  email: string
  identityNumber: string
  registrationAddress: string
  ip: string
  city: string
  country: string
  zipCode?: string
}

export interface CreatePaymentRequest {
  locale?: string
  conversationId: string
  price: string
  paidPrice: string
  currency: string
  installment: string
  basketId: string
  paymentChannel: string
  paymentGroup: string
  paymentCard?: {
    cardHolderName: string
    cardNumber: string
    expireMonth: string
    expireYear: string
    cvc: string
    registerCard?: string
  }
  buyer: IyzicoBuyer
  shippingAddress: IyzicoAddress
  billingAddress: IyzicoAddress
  basketItems: IyzicoBasketItem[]
  callbackUrl?: string
}

// Helper functions
export function formatPrice(price: number): string {
  return price.toFixed(2)
}

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
