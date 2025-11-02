import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function KPISkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  )
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td className="p-2"><Skeleton className="h-12 w-12 rounded" /></td>
      <td className="p-2"><Skeleton className="h-4 w-64" /></td>
      <td className="p-2"><Skeleton className="h-4 w-24" /></td>
      <td className="p-2"><Skeleton className="h-4 w-20" /></td>
      <td className="p-2"><Skeleton className="h-4 w-32" /></td>
      <td className="p-2"><Skeleton className="h-4 w-24" /></td>
    </tr>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left"><Skeleton className="h-4 w-12" /></th>
            <th className="p-2 text-left"><Skeleton className="h-4 w-32" /></th>
            <th className="p-2 text-left"><Skeleton className="h-4 w-24" /></th>
            <th className="p-2 text-left"><Skeleton className="h-4 w-20" /></th>
            <th className="p-2 text-left"><Skeleton className="h-4 w-32" /></th>
            <th className="p-2 text-left"><Skeleton className="h-4 w-24" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

