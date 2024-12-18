import { AlertProps } from "~/store/AlertStore"
import { Challenge, ChallengeStatus, ChallengeStore } from "~/store/challengesStore"
import { IdentityStore, verifiyStatuses } from "~/store/IdentityStore"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AtSign, Mail, MessageSquare, UserCircle, CheckCircle, AlertCircle, Coins, Info, Trash2, RefreshCcw } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "../ui/alert"

export function StatusPage({
  identityStore,
  challengeStore,
  addNotification,
}: {
  identityStore: IdentityStore,
  challengeStore: ChallengeStore,
  addNotification: (alert: AlertProps | Omit<AlertProps, "key">) => void,
}) {
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

  const onChainIdentity = identityStore.status

  return (
    <Card className="bg-transparent border-[#E6007A] text-inherit shadow-[0_0_10px_rgba(230,0,122,0.1)] overflow-x-auto">
      <CardHeader>
        <CardTitle className="text-inherit flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Identity Status
        </CardTitle>
        <CardDescription className="text-[#706D6D]">Current status of your Polkadot identity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="min-w-[300px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <strong className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Display Name:
              </strong> 
              <span>{identityStore.info.display || "Not Set"}</span>
            </div>
            <div className="flex justify-between items-center">
              <strong className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verification:
              </strong> 
              {identityStore.status == verifiyStatuses.IdentityVerified ? 
                <Badge variant="success" className="bg-[#E6007A] text-[#FFFFFF]">Verified</Badge> : 
                <Badge variant="destructive" className="bg-[#670D35] text-[#FFFFFF]">Not Verified</Badge>
              }
            </div>
            <div className="flex justify-between items-center">
              <strong className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Judgement:
              </strong> 
              <span>{verifiyStatuses[identityStore.status]}</span>
            </div>
            <div className="flex justify-between items-center">
              <strong className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Deposit:
              </strong> 
              <span>{identityStore.deposit?.toString() || "Unknown"}</span>
            </div>
          </div>
          <div className="mt-4">
            <strong>Field Statuses:</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {Object.entries(challengeStore).map(([field, { status, code }]: 
                [string, Challenge]
              ) => (
                <div key={field} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {getIcon(field)}
                    {field.charAt(0).toUpperCase() + field.slice(1)}:
                  </span>
                  <Badge 
                    variant={
                      status === ChallengeStatus.Passed ? "success" 
                      : status === ChallengeStatus.Failed ? "destructive" : "secondary"
                    }
                    className={
                      status === ChallengeStatus.Passed ? "bg-[#E6007A] text-[#FFFFFF]" 
                      : status === ChallengeStatus.Failed ? "bg-[#670D35] text-[#FFFFFF]"
                      : "text-[#FFFFFF]"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Alert variant="default" className="bg-[#393838] border-[#E6007A] text-[#FFFFFF]">
          <Info className="h-4 w-4" />
          <AlertTitle>On-chain Identity Status</AlertTitle>
          <AlertDescription>
            {onChainIdentity === verifiyStatuses.NoIdentity && "No identity set on-chain."}
            {onChainIdentity === verifiyStatuses.IdentitySet && "Identity set on-chain."}
            {onChainIdentity === verifiyStatuses.IdentityVerified && "Judgement requested and pending."}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Button variant="destructive" onClick={() => {
            addNotification({
              type: 'info', 
              message: 'Identity cleared successfully', 
            })
          }} className="bg-[#670D35] text-[#FFFFFF] hover:bg-[#91094c] flex-1">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Identity
          </Button>
          <Button variant="outline" 
            onClick={() => {
              addNotification({
                type: 'info', 
                message: 'Judgement cleared successfully', 
              })
            }} 
            className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF] flex-1" 
            disabled={onChainIdentity !== verifiyStatuses.IdentityVerified}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Clear Judgement
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
