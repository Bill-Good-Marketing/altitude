import { Card } from "~/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import type React from "react" // Added import for React

interface MetricsCardProps {
  title: string
  value: number
  lastValue: number
  chart?: React.ReactNode
}

export function MetricsCard({ title, value, lastValue, chart }: MetricsCardProps) {
  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const change = value - lastValue
  const pcntChange = value / lastValue * 100 - 100

  const percentage = `${pcntChange.toFixed(2)}%`
  const isPositive = pcntChange >= 0

  return (
    <Card className="p-4 bg-background/50 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        {chart ? <ArrowUpRight className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{moneyFormatter.format(value)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm">{isPositive ? "+" : ""}{moneyFormatter.format(change)}</span>
            <span className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
              {percentage === 'Infinity%' ? '--%' : percentage}
            </span>
          </div>
        </div>
        {chart}
      </div>
    </Card>
  )
}

