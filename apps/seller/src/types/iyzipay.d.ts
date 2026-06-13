declare module 'iyzipay' {
  interface IyzipayConfig {
    apiKey: string
    secretKey: string
    uri: string
  }

  interface PaymentCard {
    cardHolderName: string
    cardNumber: string
    expireMonth: string
    expireYear: string
    cvc: string
    registerCard?: string
  }

  interface Address {
    contactName: string
    city: string
    country: string
    address: string
    zipCode?: string
  }

  interface Buyer {
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

  interface BasketItem {
    id: string
    name: string
    category1: string
    category2?: string
    itemType: 'PHYSICAL' | 'VIRTUAL'
    price: string
  }

  interface PaymentRequest {
    locale?: string
    conversationId: string
    price: string
    paidPrice: string
    currency: string
    installment: string
    basketId: string
    paymentChannel: string
    paymentGroup: string
    paymentCard?: PaymentCard
    buyer: Buyer
    shippingAddress: Address
    billingAddress: Address
    basketItems: BasketItem[]
    callbackUrl?: string
  }

  interface CheckoutFormInitializeRequest {
    locale?: string
    conversationId: string
    price: string
    paidPrice: string
    currency: string
    basketId: string
    paymentGroup: string
    buyer: Buyer
    shippingAddress: Address
    billingAddress: Address
    basketItems: BasketItem[]
    callbackUrl: string
    enabledInstallments?: number[]
  }

  interface CheckoutFormRetrieveRequest {
    locale?: string
    conversationId?: string
    token: string
  }

  interface PaymentResult {
    status: string
    errorCode?: string
    errorMessage?: string
    errorGroup?: string
    locale?: string
    systemTime?: number
    conversationId?: string
    price?: number
    paidPrice?: number
    installment?: number
    paymentId?: string
    fraudStatus?: number
    merchantCommissionRate?: number
    merchantCommissionRateAmount?: number
    iyziCommissionRateAmount?: number
    iyziCommissionFee?: number
    cardType?: string
    cardAssociation?: string
    cardFamily?: string
    binNumber?: string
    lastFourDigits?: string
    basketId?: string
    currency?: string
    itemTransactions?: any[]
    authCode?: string
    phase?: string
    mdStatus?: number
    hostReference?: string
    token?: string
    callbackUrl?: string
    paymentPageUrl?: string
    checkoutFormContent?: string
    tokenExpireTime?: number
    paymentStatus?: string
  }

  class Iyzipay {
    constructor(config: IyzipayConfig)
    
    payment: {
      create(request: PaymentRequest, callback: (err: Error | null, result: PaymentResult) => void): void
    }
    
    checkoutFormInitialize: {
      create(request: CheckoutFormInitializeRequest, callback: (err: Error | null, result: PaymentResult) => void): void
    }
    
    checkoutForm: {
      retrieve(request: CheckoutFormRetrieveRequest, callback: (err: Error | null, result: PaymentResult) => void): void
    }
  }

  export = Iyzipay
}
