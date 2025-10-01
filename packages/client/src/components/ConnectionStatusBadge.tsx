import { Badge } from "@/components/ui/badge"
import { CircleCheck, CircleOffIcon } from "lucide-react"
import { Status, STATUS } from "@/constants/connectionSources"

interface ConnectionStatusBadgeProps {
  status: Status;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  return status === STATUS.NOT_CONNECTED ? (
    <Badge variant="outline" className="flex items-center gap-1 self-center">
      <CircleOffIcon className="h-4 w-4 text-muted-foreground" />
      {status}
    </Badge>
  ) : (
    <Badge variant="outline" className="flex items-center gap-1 border-green-500 self-center">
      <CircleCheck className="h-4 w-4 text-green-500" />
      {status}
    </Badge>
  )
}
