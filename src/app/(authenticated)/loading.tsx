// app/(authenticated)/loading.tsx
import { Loader2 } from 'lucide-react'
import { Card } from '~/components/ui/card'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 transition-colors duration-500">
      <Card className="p-6 glass-card">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-center text-sm">Loading...</p>
      </Card>
    </div>
  )
}
