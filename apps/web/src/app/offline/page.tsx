'use client'

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="text-6xl">📱</div>
        <h1 className="text-3xl font-bold">Çevrimdışı Modasınız</h1>
        <p className="text-muted-foreground max-w-md">
          İnternet bağlantınızı kontrol edin. Bağlantı sağlandığında sayfa otomatik olarak yenilenecektir.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
