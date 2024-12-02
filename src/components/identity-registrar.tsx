import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, UserCircle, Shield, FileCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { ConnectionDialog } from "dot-connect/react.js"
import Header from "./Header"
import { chainStore as _chainStore, ChainInfo } from '~/store/ChainStore'
import { appStore } from '~/store/AppStore'
import { alertsStore as _alertsStore, pushAlert, removeAlert, AlertProps } from '~/store/AlertStore'
import { useSnapshot } from "valtio"
import { useProxy } from "valtio/utils"
import { identityStore as _identityStore, verifiyStatuses } from "~/store/IdentityStore"
import { challengeStore as _challengeStore, ChallengeStatus } from "~/store/challengesStore"
import { useConfig } from "~/api/config2"
import { useAccounts, useChainSpecData, useClient, useTypedApi } from "@reactive-dot/react"
import { accountStore as _accountStore } from "~/store/AccountStore"
import { IdentityForm } from "./tabs/IdentityForm"
import { ChallengePage } from "./tabs/ChallengePage"
import { StatusPage } from "./tabs/StatusPage"
import { IdentityJudgement } from "@polkadot-api/descriptors"
import { useChainRealTimeInfo } from "~/hooks/useChainRealTimeInfo"
import { TypedApi } from "polkadot-api"
import { useIdentityWebSocket } from "~/hooks/useIdentityWebSocket"
import BigNumber from "bignumber.js"

export function IdentityRegistrarComponent() {
  const [currentPage, setCurrentPage] = useState(0)
  const [account, setAccount] = useState("")
  const [network, setNetwork] = useState("")
  const alertsStore = useProxy(_alertsStore);
  const { isDarkMode } = useSnapshot(appStore)
  const [errorMessage, setErrorMessage] = useState("")
  const [onChainIdentity, setOnChainIdentity] = useState<'none' | 'set' | 'requested'>('none')

  const pages = [
    { name: "Identity Form", icon: <UserCircle className="h-5 w-5" /> },
    { name: "Challenges", icon: <Shield className="h-5 w-5" /> },
    { name: "Status", icon: <FileCheck className="h-5 w-5" /> }
  ]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const addNotification = (alert: AlertProps | Omit<AlertProps, "key">) => {
    const key = (alert as AlertProps).key || (new Date()).toISOString();
    pushAlert({ ...alert, key });
  }

  const removeNotification = (key: string) => {
    removeAlert(key)
  }

  const checkOnChainIdentity = () => {
    window.setTimeout(() => {
      const statuses = ['none', 'set', 'requested'] as const
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      setOnChainIdentity(randomStatus)
    }, 1000)
  }

  useEffect(() => {
    if (account && network) {
      checkOnChainIdentity()
    }
  }, [account, network])

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  //# region Chains
  const identityStore = useProxy(_identityStore);
  const challengeStore = useProxy(_challengeStore);
  const chainContext = useConfig();
  const chainStore = useProxy(_chainStore);
  const typedApi = useTypedApi({ chainId: chainStore.id })
  //# endregion Chains
  
  //#region accounts
  const accountStore = useProxy(_accountStore)
  useEffect(() => {
    import.meta.env.DEV && console.log({accountStore})
  }, [accountStore])

  const accounts = useAccounts()
  useEffect(() => {
    if (!accountStore.address || accounts.length < 1) {
      return;
    }
    const foundAccount = accounts.find(account => account.address === accountStore.address)
    if (!foundAccount) {
      return;
    }
    Object.assign(accountStore, foundAccount)
  }, [accountStore, accounts])
  //#endregion accounts

  //# region identity
  const getIdAndJudgement = () => typedApi.query.Identity.IdentityOf
    .getValue(accountStore.address)
    .then((result) => {
      import.meta.env.DEV && console.log({ identityOf: result })
      if (!result) {
        identityStore.status = verifiyStatuses.NoIdentity;
        return;
      }
      const identityOf = result[0];
      const identityData = Object.fromEntries(Object.entries(identityOf.info)
        .filter(([_, value]) => value?.type?.startsWith("Raw"))
        .map(([key, value]) => [key, value.value.asText()])
      );
      identityStore.deposit = identityOf.deposit
      identityStore.info = identityData;
      identityStore.status = verifiyStatuses.IdentitySet;
      const idJudgementOfId = identityOf.judgements;
      const judgementsData: typeof identityStore.judgements = idJudgementOfId.map((judgement) => ({
        registrar: {
          index: judgement[0],
        },
        state: judgement[1].type,
        fee: judgement[1].value,
      }));
      if (judgementsData.length > 0) {
        identityStore.judgements = judgementsData;
        identityStore.status = verifiyStatuses.JudgementRequested;
      }
      if (judgementsData.find(j => j.state === IdentityJudgement.FeePaid().type)) {
        identityStore.status = verifiyStatuses.FeePaid;
      }
      if (judgementsData.find(j => [
        IdentityJudgement.Reasonable().type,
        IdentityJudgement.KnownGood().type,
      ].includes(j.state))) {
        identityStore.status = verifiyStatuses.IdentityVerified;
      }
      const idDeposit = identityOf.deposit;
      // TODO Compute approximate reserve
      import.meta.env.DEV && console.log({
        identityOf,
        identityData,
        judgementsData,
        idDeposit,
      });
    })
    .catch(e => {
      if (import.meta.env.DEV) {
        console.error("Couldn't get identityOf");
        console.error(e);
      }
    });
  useEffect(() => {
    if (accountStore.address) {
      getIdAndJudgement();
    }
  }, [accountStore.address, typedApi])
  //# endregion identity
  
  //# region chains
  const chainSpecData = useChainSpecData()
  
  useEffect(() => {
    (async () => {
      const id = import.meta.env.VITE_APP_DEFAULT_CHAIN || chainStore.id;
      
      const newChainData = {
        name: chainContext.config.chains[id].name,
        registrarIndex: chainContext.config.chains[id].registrarIndex,
        ...chainSpecData.properties,
      }
      Object.assign(chainStore, newChainData)
      import.meta.env.DEV && console.log({ id, newChainData })
    })()
  }, [chainStore.id])
  //# endregion chains

  const chainEvents = useChainRealTimeInfo({
    typedApi,
    chainStore,
    accountStore,
    handlers: {
      "Identity.IdentitySet": {
        onEvent: data => {
          /* appState.verificationProgress =
            // As we do batch calls, we need to know if judgeent is already awaiting
            appStateSnapshot.verificationProgress === IdentityVerificationStatuses.NoIdentity
              ? IdentityVerificationStatuses.IdentitySet
              : appStateSnapshot.verificationProgress */
          addNotification({
            type: "info",
            message: "Identity Set for this account",
          })
        },
        onError: error => {  },
      },
      "Identity.IdentityCleared": {
        onEvent: data => {
          /* appState.verificationProgress = IdentityVerificationStatuses.NoIdentity;
          appState.identity = null; */
          addNotification({
            type: "info",
            message: "Identity cleared for this account",
          })
        },
        onError: error => { },
      },
      "Identity.JudgementRequested": {
        onEvent: data => {
          //appState.verificationProgress = IdentityVerificationStatuses.JudgementRequested
          addNotification({
            type: "info",
            message: "Judgement Requested for this account",
          })
        },
        onError: error => { },
      },
      "Identity.JudgementGiven": {
        onEvent: data => {
          getIdAndJudgement()
          addNotification({
            type: "info",
            message: "Judgement Given for this account",
          })
        },
        onError: error => { },
      },
    },
  })
  //# endregion chains
  
  //# region challenges
  const identityWebSocket = useIdentityWebSocket({
    url: import.meta.env.VITE_APP_CHALLENGES_API_URL,
    account: accountStore.address,
    onNotification: (notification) => {
      import.meta.env.DEV && console.log('Received notification:', notification);
    }
  });
  const { accountState, error, requestVerificationSecret, verifyIdentity } = identityWebSocket
  const idWsDeps = [accountState, error, accountStore.address, identityStore.info, chainStore.id]
  useEffect(() => {
    if (idWsDeps.some((value) => value === undefined)) {
      if (error) {
        import.meta.env.DEV && console.error(error)
      }
      return
    }
    import.meta.env.DEV && console.log({ accountState })
    if (accountState) {
      const {
        pending_challenges,
        verification_state: { fields: verifyState },
      } = accountState;
      const pendingChallenges = Object.fromEntries(pending_challenges)

      const challenges: Record<string, Challenge> = {};
      Object.entries(verifyState)
        .forEach(([key, value]) => challenges[key] = {
          status: value ? ChallengeStatus.Passed : ChallengeStatus.Pending,
          code: !value && pendingChallenges[key],
        })
      Object.assign(challengeStore, challenges)

      import.meta.env.DEV && console.log({
        origin: "accountState",
        pendingChallenges,
        verifyState,
        challenges,
      })
    }
  }, idWsDeps)
  //# endregion challenges

  const formatAmount = (amount: number | bigint | BigNumber | string, decimals?) => {
    if (!amount) {
      return "---"
    }
    const newAmount = BigNumber(amount.toString()).dividedBy(BigNumber(10).pow(chainStore.tokenDecimals)).toString()
    return `${newAmount} ${chainStore.tokenSymbol}`;
  }

  return <>
    <ConnectionDialog open={walletDialogOpen} 
      onClose={() => { setWalletDialogOpen(false) }} 
      dark={appStore.isDarkMode}
    />
    <div className={`min-h-screen p-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#2C2B2B] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#1E1E1E]'}`}>
      <div className="container mx-auto max-w-3xl font-mono">
        <Header chainContext={chainContext} chainStore={chainStore} accountStore={accountStore} 
          identityStore={identityStore}
          onRequestWalletConnections={() => setWalletDialogOpen(true)}
          onIdentityClear={() => typedApi.tx.Identity.clear_identity().signAndSubmit(
            accountStore?.polkadotSigner
          )}
        />

        {errorMessage && (
          <Alert variant="destructive" className="mb-4 bg-[#FFCCCB] border-[#E6007A] text-[#670D35]">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {[...alertsStore.entries()].map(([key, alert]) => (
          <Alert 
            key={alert.key} 
            variant={alert.type === 'error' ? "destructive" : "default"} 
            className={`mb-4 ${
              alert.type === 'error' 
                ? 'bg-[#FFCCCB] border-[#E6007A] text-[#670D35]' 
                : isDarkMode 
                  ? 'bg-[#393838] border-[#E6007A] text-[#FFFFFF]' 
                  : 'bg-[#FFE5F3] border-[#E6007A] text-[#670D35]'
            }`}
          >
            <AlertTitle>{alert.type === 'error' ? 'Error' : 'Notification'}</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              {alert.message}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeNotification(alert.key)} 
                className={`${
                  isDarkMode 
                    ? 'text-[#FFFFFF] hover:text-[#E6007A]' 
                    : 'text-[#670D35] hover:text-[#E6007A]'
                }`}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        ))}

        <Tabs defaultValue={pages[currentPage].name} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#393838] overflow-hidden">
            {pages.map((page, index) => (
              <TabsTrigger 
                key={index} 
                value={page.name} 
                onClick={() => setCurrentPage(index)}
                className="data-[state=active]:bg-[#E6007A] data-[state=active]:text-[#FFFFFF] flex items-center justify-center py-2 px-1"
              >
                {page.icon}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={pages[0].name}>
            <IdentityForm 
              addNotification={addNotification}
              identityStore={identityStore}
              chainStore={chainStore}
              typedApi={typedApi as TypedApi<ChainInfo.id>}
              accountStore={accountStore}
            />
          </TabsContent>
          <TabsContent value={pages[1].name}>
            <ChallengePage 
              identityStore={identityStore}
              addNotification={addNotification}
              challengeStore={challengeStore}
              requestVerificationSecret={requestVerificationSecret}
              verifyField={verifyIdentity}
            />
          </TabsContent>
          <TabsContent value={pages[2].name}>
            <StatusPage 
              identityStore={identityStore}
              addNotification={addNotification}
              challengeStore={challengeStore}
              formatAmount={formatAmount}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF]"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button
            onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))}
            disabled={currentPage === pages.length - 1}
            className="bg-[#E6007A] text-[#FFFFFF] hover:bg-[#BC0463]"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </>
}
