import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AtSign, Mail, MessageSquare, UserCircle, Copy, CheckCircle } from "lucide-react"
import { AlertProps } from "~/store/AlertStore"
import { IdentityStore, verifiyStatuses } from "~/store/IdentityStore"

export function ChallengePage({
  addNotification,
  identityStore,
}: {
  identityStore: IdentityStore,
  addNotification: (alert: AlertProps | Omit<AlertProps, "key">) => void,
}) {
  const [challenges, setChallenges] = useState({
    matrix: { code: "234567", status: "pending" },
    email: { code: "345678", status: "verified" },
    discord: { code: "456789", status: "failed" },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addNotification({
      type: 'info', 
      message: 'Challenge code copied to clipboard', 
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="success" className="bg-[#E6007A] text-[#FFFFFF]">Verified</Badge>
      case "failed":
        return <Badge variant="destructive" className="bg-[#670D35] text-[#FFFFFF]">Failed</Badge>
      default:
        return <Badge variant="secondary" className="bg-[#706D6D] text-[#FFFFFF]">Pending</Badge>
    }
  }

  const getIcon = (field: string) => {
    switch (field) {
      case "matrix":
        return <AtSign className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "discord":
        return <MessageSquare className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card className="bg-transparent border-[#E6007A] text-inherit shadow-[0_0_10px_rgba(230,0,122,0.1)]">
      <CardContent className="space-y-6 p-4 overflow-x-auto">
        <div className="min-w-[300px]">
          <div className="mb-4">
            <Label className="text-inherit flex items-center gap-2 mb-2">
              <UserCircle className="h-4 w-4" />
              Display Name
            </Label>
            <div className="flex justify-between items-center">
              <span>{identityStore.info?.display || "Not Set"}</span>
              {identityStore.status === verifiyStatuses.IdentityVerified && (
                <Badge variant="success" className="bg-[#E6007A] text-[#FFFFFF]">Verified</Badge>
              )}
            </div>
          </div>
          {Object.entries(challenges).map(([field, { code, status }]) => (
            <div key={field} className="mb-4 last:mb-0">
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor={field} className="text-inherit flex items-center gap-2">
                  {getIcon(field)}
                  <span className="hidden sm:inline">{field.charAt(0).toUpperCase() + field.slice(1)} Challenge</span>
                  <span className="sm:hidden">{field.charAt(0).toUpperCase()}</span>
                </Label>
                {getStatusBadge(status)}
              </div>
              <div className="flex space-x-2 items-center">
                <Input id={field} value={code} readOnly className="bg-transparent border-[#E6007A] text-inherit flex-grow" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(code)} className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF] flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => {
          addNotification({
            type: 'info', 
            message: 'Challenges verified successfully', 
          })
        }} className="bg-[#E6007A] text-[#FFFFFF] hover:bg-[#BC0463] w-full">
          <CheckCircle className="mr-2 h-4 w-4" />
          Verify Challenges
        </Button>
      </CardContent>
    </Card>
  )
}
function useState(arg0: { matrix: { code: string; status: string }; email: { code: string; status: string }; discord: { code: string; status: string } }): [any, any] {
  throw new Error("Function not implemented.")
}

