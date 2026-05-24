import { Skeleton } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container max-w-6xl py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-48 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-5 w-32 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
            <Skeleton className="h-3 w-36 mx-auto" />
          </div>
        ))}
      </div>

      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}
