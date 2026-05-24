'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { useCartStore } from '@/stores/cart-store'
import { ChevronRight, CreditCard, Truck, MapPin, Check, AlertCircle, Loader2, Shield, Lock, CreditCard as CreditCardIcon, Plus, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useShippingConfig, calculateShippingCost } from '@/hooks/use-shipping-config'
import { CouponInput } from '@/components/cart/coupon-input'

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'confirmation'

interface AppliedCoupon {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  discountAmount: number
  freeShipping: boolean
}

interface SavedAddress {
  id: string
  title: string
  first_name: string
  last_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  district: string
  postal_code?: string | null
  is_default: boolean | null
  address_type: 'shipping' | 'billing' | 'both' | null
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null)
  const [paymentBasketId, setPaymentBasketId] = useState<string | null>(null)
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)
  const iframeRef = useRef<HTMLDivElement>(null)
  const { items, getTotalPrice, isHydrated } = useCartStore()

  // Dynamic shipping config from store settings
  const shippingConfig = useShippingConfig(items.map(i => i.productId))

  // User & addresses state
  const [userEmail, setUserEmail] = useState<string>('')
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null)
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [saveNewAddress, setSaveNewAddress] = useState(true)
  const [newAddressTitle, setNewAddressTitle] = useState('Ev')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const [formData, setFormData] = useState({
    // Address
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    // Shipping
    shippingMethod: 'standard',
  })

  // Load user info and saved addresses on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Get user profile for email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, first_name, last_name, phone')
            .eq('id', user.id)
            .single()

          if (profile?.email) {
            setUserEmail(profile.email)
            setFormData(prev => ({ 
              ...prev, 
              email: profile.email,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              phone: profile.phone || '',
            }))
          }

          // Get saved addresses
          const { data: addresses } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

          if (addresses && addresses.length > 0) {
            setSavedAddresses(addresses as SavedAddress[])
            
            // Auto-select default shipping address
            const defaultAddress = addresses.find(a => a.is_default)
            if (defaultAddress) {
              setSelectedShippingId(defaultAddress.id)
              fillFormFromAddress(defaultAddress as SavedAddress)
            }
          } else {
            setShowNewAddressForm(true)
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUserData()
  }, [])

  const fillFormFromAddress = (address: SavedAddress) => {
    setFormData(prev => ({
      ...prev,
      firstName: address.first_name,
      lastName: address.last_name,
      phone: address.phone,
      address: address.address_line2 
        ? `${address.address_line1} ${address.address_line2}`
        : address.address_line1,
      city: address.city,
      district: address.district,
      postalCode: address.postal_code || '',
    }))
  }

  const subtotal = getTotalPrice()
  const discountAmount = appliedCoupon?.discountAmount || 0
  const afterDiscount = subtotal - discountAmount
  const shippingCost = calculateShippingCost(
    shippingConfig,
    afterDiscount,
    formData.shippingMethod as 'standard' | 'express',
    { freeShipping: appliedCoupon?.freeShipping }
  )
  const total = afterDiscount + shippingCost

  const steps = [
    { id: 'address', label: 'Adres', icon: MapPin },
    { id: 'shipping', label: 'Kargo', icon: Truck },
    { id: 'payment', label: 'Ödeme', icon: CreditCard },
    { id: 'confirmation', label: 'Onay', icon: Check },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  // Check for error from callback
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      setPaymentError(decodeURIComponent(error))
      setCurrentStep('payment')
    }
  }, [searchParams])

  // Redirect to cart if empty - must be in useEffect
  useEffect(() => {
    if (isHydrated && items.length === 0 && currentStep !== 'confirmation') {
      router.push('/sepet')
    }
  }, [isHydrated, items.length, currentStep, router])

  // Initialize iyzico checkout when reaching payment step
  useEffect(() => {
    if (currentStep === 'payment' && !checkoutFormContent && !isProcessing) {
      initializePayment()
    }
  }, [currentStep])

  // Render iyzico form when content is available
  useEffect(() => {
    if (checkoutFormContent && iframeRef.current) {
      iframeRef.current.innerHTML = checkoutFormContent
      
      // Execute any scripts in the iyzico content
      const addedScripts: HTMLScriptElement[] = []
      const scripts = iframeRef.current.querySelectorAll('script')
      scripts.forEach((script) => {
        const newScript = document.createElement('script')
        newScript.setAttribute('data-iyzico-checkout', 'true')
        if (script.src) {
          newScript.src = script.src
        } else {
          newScript.textContent = script.textContent
        }
        document.body.appendChild(newScript)
        addedScripts.push(newScript)
      })

      // Cleanup: remove injected scripts on unmount or re-render
      return () => {
        addedScripts.forEach((s) => s.remove())
      }
    }
  }, [checkoutFormContent])

  const initializePayment = async () => {
    setIsProcessing(true)
    setPaymentError(null)
    setNeedsAuth(false)
    
    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          customer: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
          },
          shippingAddress: {
            address: formData.address,
            city: formData.city,
            district: formData.district,
            postalCode: formData.postalCode,
          },
          totalPrice: afterDiscount,
          shippingCost: shippingCost,
          discountAmount: discountAmount,
          couponCode: appliedCoupon?.code || null,
          basketId: paymentBasketId,
          selectedShippingAddressId: selectedShippingId, // Seçilen adres ID'si
          selectedBillingAddressId: sameAsBilling ? selectedShippingId : selectedBillingId,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true)
          throw new Error('Ödeme için giriş yapmanız gerekiyor.')
        }
        throw new Error(data.error || 'Ödeme başlatılamadı')
      }

      setCheckoutFormContent(data.checkoutFormContent)
      if (data.basketId) setPaymentBasketId(data.basketId)
      if (data.orderId) setPaymentOrderId(data.orderId)
      setNeedsAuth(false)
    } catch (error) {
      console.error('Payment initialization error:', error)
      setPaymentError(error instanceof Error ? error.message : 'Ödeme başlatılırken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNext = async () => {
    const stepOrder: CheckoutStep[] = ['address', 'shipping', 'payment', 'confirmation']
    const currentIndex = stepOrder.indexOf(currentStep)
    
    // Save new address to DB when moving from address step
    if (currentStep === 'address' && showNewAddressForm && saveNewAddress) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const isFirst = savedAddresses.length === 0
          
          if (isFirst) {
            // Unset existing defaults
            await supabase
              .from('addresses')
              .update({ is_default: false })
              .eq('user_id', user.id)
          }

          const { data: newAddr } = await supabase
            .from('addresses')
            .insert({
              user_id: user.id,
              title: newAddressTitle.trim() || 'Adres',
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              phone: formData.phone.trim(),
              address_line1: formData.address.trim(),
              city: formData.city.trim(),
              district: formData.district.trim(),
              postal_code: formData.postalCode.trim() || null,
              is_default: isFirst,
              address_type: 'both',
            })
            .select()
            .single()

          if (newAddr) {
            setSavedAddresses(prev => [...prev, newAddr as SavedAddress])
            setSelectedShippingId(newAddr.id)
          }
        }
      } catch (err) {
        console.error('Error saving address:', err)
      }
    }

    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: CheckoutStep[] = ['address', 'shipping', 'payment', 'confirmation']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
      setCheckoutFormContent(null) // Reset checkout form when going back
    }
  }

  const validateAddressForm = () => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.address.trim() !== '' &&
      formData.city.trim() !== ''
    )
  }

  // Show loading until hydration completes
  if (!isHydrated) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (items.length === 0 && currentStep !== 'confirmation') {
    return null
  }

  return (
    <div className="container py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index <= currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 mx-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Address Step */}
          {currentStep === 'address' && (
            <Card>
              <CardHeader>
                <CardTitle>Teslimat Adresi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUser ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : savedAddresses.length > 0 && !showNewAddressForm ? (
                  <>
                    {/* Saved Addresses Selection */}
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedShippingId === addr.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => {
                            setSelectedShippingId(addr.id)
                            fillFormFromAddress(addr)
                          }}
                        >
                          <input
                            type="radio"
                            name="shipping-address"
                            value={addr.id}
                            checked={selectedShippingId === addr.id}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{addr.title}</h3>
                              {addr.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Varsayılan
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {addr.first_name} {addr.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {addr.address_line1}
                              {addr.address_line2 && ` ${addr.address_line2}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {addr.district} / {addr.city}
                              {addr.postal_code && ` - ${addr.postal_code}`}
                            </p>
                            <p className="text-sm text-muted-foreground">{addr.phone}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowNewAddressForm(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Yeni Adres Ekle
                    </Button>

                    {/* Billing Address Option */}
                    <div className="border-t pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sameAsBilling}
                          onChange={(e) => setSameAsBilling(e.target.checked)}
                        />
                        <span className="text-sm">Fatura adresi teslimat adresiyle aynı</span>
                      </label>
                    </div>

                    <Button 
                      onClick={handleNext} 
                      className="w-full"
                      disabled={!selectedShippingId}
                    >
                      Devam Et
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* New Address Form */}
                    {savedAddresses.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowNewAddressForm(false)
                          const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0]
                          setSelectedShippingId(defaultAddr.id)
                          fillFormFromAddress(defaultAddr)
                        }}
                        className="mb-4"
                      >
                        ← Kayıtlı Adreslerime Dön
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Ad</label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Adınız"
                          autoComplete="given-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Soyad</label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Soyadınız"
                          autoComplete="family-name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Telefon</label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="05XX XXX XX XX"
                          autoComplete="tel"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">E-posta</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="ornek@email.com"
                          autoComplete="email"
                          disabled={!!userEmail}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Adres</label>
                      <textarea
                        className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Mahalle, sokak, bina no, daire no..."
                        autoComplete="street-address"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">İl</label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="İstanbul"
                          autoComplete="address-level1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">İlçe</label>
                        <Input
                          value={formData.district}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          placeholder="Kadıköy"
                          autoComplete="address-level2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Posta Kodu</label>
                        <Input
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          placeholder="34000"
                          autoComplete="postal-code"
                        />
                      </div>
                    </div>

                    {/* Save Address Option */}
                    <div className="border-t pt-4 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveNewAddress}
                          onChange={(e) => setSaveNewAddress(e.target.checked)}
                        />
                        <span className="text-sm">Bu adresi kaydet</span>
                      </label>
                      {saveNewAddress && (
                        <div>
                          <label className="text-sm font-medium">Adres Başlığı</label>
                          <Input
                            value={newAddressTitle}
                            onChange={(e) => setNewAddressTitle(e.target.value)}
                            placeholder="Ev, İş, vb."
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={handleNext} 
                      className="w-full"
                      disabled={!validateAddressForm()}
                    >
                      Devam Et
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Step */}
          {currentStep === 'shipping' && (
            <Card>
              <CardHeader>
                <CardTitle>Kargo Seçenekleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-primary">
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="shipping"
                      value="standard"
                      checked={formData.shippingMethod === 'standard'}
                      onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                    />
                    <div>
                      <p className="font-medium">Standart Kargo</p>
                      <p className="text-sm text-muted-foreground">3-5 iş günü içinde teslimat</p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {calculateShippingCost(shippingConfig, subtotal, 'standard') === 0 ? 'Ücretsiz' : formatPrice(shippingConfig.standardShippingCost)}
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-primary">
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="shipping"
                      value="express"
                      checked={formData.shippingMethod === 'express'}
                      onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                    />
                    <div>
                      <p className="font-medium">Hızlı Kargo</p>
                      <p className="text-sm text-muted-foreground">1-2 iş günü içinde teslimat</p>
                    </div>
                  </div>
                  <span className="font-medium">{formatPrice(49.99)}</span>
                </label>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Geri
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Devam Et
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle>Ödeme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentError && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {needsAuth && !isProcessing && !checkoutFormContent && (
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Geri
                    </Button>
                    <Button
                      onClick={() => router.push('/giris?redirect=/odeme')}
                      className="flex-1"
                    >
                      Giriş Yap
                    </Button>
                  </div>
                )}

                {isProcessing && !checkoutFormContent && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Ödeme formu yükleniyor...</p>
                  </div>
                )}

                {/* iyzico Checkout Form */}
                {checkoutFormContent && (
                  <div ref={iframeRef} className="min-h-[400px]" />
                )}

                {!checkoutFormContent && !isProcessing && paymentError && !needsAuth && (
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Geri
                    </Button>
                    <Button onClick={initializePayment} className="flex-1">
                      Tekrar Dene
                    </Button>
                  </div>
                )}

                {!checkoutFormContent && !isProcessing && !paymentError && (
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Geri
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <Lock className="h-5 w-5 text-green-600" />
                  <span className="text-sm flex-1">Ödemeniz iyzico güvencesi ile işlenmektedir.</span>
                  <Image 
                    src="/images/payment/iyzico-logo.png" 
                    alt="iyzico ile Ödeme" 
                    width={80} 
                    height={28} 
                    className="h-7 w-auto object-contain"
                  />
                </div>

                {/* Security Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 border rounded-lg bg-white/50">
                    <Shield className="h-6 w-6 text-green-600" />
                    <span className="text-[10px] font-semibold text-center leading-tight">SSL<br/>Güvenli Bağlantı</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 border rounded-lg bg-white/50">
                    <Lock className="h-6 w-6 text-blue-600" />
                    <span className="text-[10px] font-semibold text-center leading-tight">256-bit<br/>Şifreleme</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 border rounded-lg bg-white/50">
                    <CreditCardIcon className="h-6 w-6 text-purple-600" />
                    <span className="text-[10px] font-semibold text-center leading-tight">PCI DSS<br/>Sertifikalı</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 p-3 border rounded-lg">
                  <span className="text-xs text-muted-foreground">Güvenli Ödeme:</span>
                  <div className="flex gap-2 items-center">
                    <Image 
                      src="/images/payment/visa.png" 
                      alt="Visa" 
                      width={30} 
                      height={20} 
                      className="h-4 w-auto object-contain"
                    />
                    <Image 
                      src="/images/payment/mastercard.png" 
                      alt="MasterCard" 
                      width={30} 
                      height={20} 
                      className="h-4 w-auto object-contain"
                    />
                    <div
                      className="h-4 px-1.5 rounded border flex items-center text-[9px] font-semibold text-muted-foreground"
                      aria-label="Troy"
                    >
                      TROY
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Adet: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {/* Coupon Input */}
                <CouponInput
                  subtotal={subtotal}
                  onApply={(coupon) => setAppliedCoupon(coupon)}
                  appliedCoupon={appliedCoupon}
                />

                {/* Discount Display */}
                {appliedCoupon && discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Kupon ({appliedCoupon.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                {appliedCoupon?.freeShipping && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Kargo Bedava ({appliedCoupon.code})</span>
                    <span>—</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Ücretsiz</span>
                  ) : (
                    <span>{formatPrice(shippingCost)}</span>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Toplam</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
