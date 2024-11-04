import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { RouteType } from '~/routes';
import { routes } from '~/routes';

import { config } from "./api/config";
import { proxy, useSnapshot } from 'valtio';

import { ConnectionDialog } from "dot-connect/react.js";
import { useAccounts, useClient, useQueryLoader, useTypedApi } from '@reactive-dot/react';
import { PolkadotSigner } from 'polkadot-api';
import { CHAIN_UPDATE_INTERVAL, IdentityVerificationStates } from './constants';
import { useIdentityEncoder } from './hooks/hashers/identity';
import { IdentityJudgement } from '@polkadot-api/descriptors';
import { mergeMap } from 'rxjs';
import { unstable_getBlockExtrinsics } from '@reactive-dot/core';


interface Props {
  route: RouteType;
}

function Loading() {
  return (
    <div className='h-100vh flex-center'>
    </div>
  );
}

const DomTitle: React.FC<Props> = ({ route }) => {
  React.useEffect(() => {
    if (route.meta?.title) {
      document.title = `${route.meta.title} | Reactease`;
    }
  }, [route]);

  return (
    <Suspense fallback={<Loading />}>
      <route.element />
    </Suspense>
  );
};

export const appState: {
  chain: {
    id: string;
    ss58Format: number;
    tokenDecimals: number;
    tokenSymbol: string;
  },
  walletDialogOpen: boolean,
  account?: {
    id: string,
    name: string,
    address: string,
    polkadotSigner: PolkadotSigner;
    balance: {
      free: bigint;
      reserved: bigint;
      frozen: bigint;
      flags: bigint;
    };
  },
  identity?: {
    displayName: string,
    matrix: string,
    discord: string,
    email: string,
    twitter: string,
  },
  judgements?: Array<{
    registrar: {
      index: number
    },
    state: keyof IdentityJudgement,
    fee: bigint,
  }>
  challenges: Record<string, {
    value: string,
    verified: boolean,
  }>,
  hashes: {
    identityOf?: Uint16Array,
  },
  fees: {
    requestJdgement?: bigint,
    setIdentityAndRequestJudgement?: bigint,
  },
  reserves: {},
  verificationProgress: IdentityVerificationStates,
} = proxy({
  chain: { 
    id: import.meta.env.VITE_APP_DEFAULT_CHAIN || Object.keys(config.chains)[0],
  },
  walletDialogOpen: false,
  challenges: {
    matrix: { value: '', verified: false },
    email: { value: '', verified: false },
    discord: { value: '', verified: false },
    twitter: { value: '', verified: false }
  },
  hashes: {},
  verificationProgress: IdentityVerificationStates.Unknown,
})

export default function App() {
  const appStateSnapshot = useSnapshot(appState)
  
  const typedApi = useTypedApi({ chainId: appStateSnapshot.chain.id })

  // Osed to keep last identity data from chain
  const [onChainIdentity, setOnChainIdentity] = useState()
  const { calculateHash: calculateHashPrev } = useIdentityEncoder(onChainIdentity)
  const { calculateHash } = useIdentityEncoder(appStateSnapshot.identity)
  useEffect(() => {
    if (onChainIdentity) {
      const prevIdHash = calculateHashPrev();
      const curIdHash = calculateHash();
      import.meta.env.DEV && console.log({ prevIdHash, curIdHash })
      if (curIdHash !== prevIdHash) {
        appState.hashes = { ...appStateSnapshot.hashes, identity: prevIdHash }
      }
    }
  }, [onChainIdentity])

  useEffect(() => {
    if (appState.account?.address) {
      typedApi.query.Identity.IdentityOf.getValue(appState.account?.address)
        .then((result) => {
          if (!result) {
            appState.verificationProgress = IdentityVerificationStates.NoIdentity
            return;
          }
          const identityOf = result[0]

          const identityData = Object.fromEntries(Object.entries(identityOf.info)
            .filter(([_, value]) => value?.type?.startsWith("Raw"))
            .map(([key, value]) => [key, value.value.asText()])
          );
          appState.identity = identityData
          appState.verificationProgress = IdentityVerificationStates.IdentitySet;
          setOnChainIdentity(identityData)

          const idJudgementOfId = identityOf.judgements;
          const judgementData: typeof appState.judgements = idJudgementOfId.map((judgement) => ({
            registrar: {
              index: judgement[0],
            },
            state: judgement[1].type,
            fee: judgement[1].value,
          }));
          appState.judgements = judgementData;
          appState.verificationProgress = IdentityVerificationStates.JudgementRequested;
          
          if (judgementData.find(j => j.state === IdentityJudgement.FeePaid().type)) {
            appState.verificationProgress = IdentityVerificationStates.FeePaid;
          }
          if (judgementData.find(j => [
            IdentityJudgement.Reasonable().type, 
            IdentityJudgement.KnownGood().type,
          ].includes(j.state))) {
            appState.verificationProgress = IdentityVerificationStates.IdentityVerifid;
          }

          const idDeposit = identityOf.deposit
          // TODO  Compue approximate reserve

          import.meta.env.DEV && console.log({
            identityOf,
            identityData,
            judgementData,
            idDeposit,
          })
        })
        .catch(e => {
          if (import.meta.env.DEV) {
            console.error("Couldn't get identityOf")
            console.error(e)
          }
        })
    }
  }, [appState.account?.address])

  const chainClient = useClient({ chainId: appStateSnapshot.chain.id })

  //const [relevantBlocks, setRelevantBlocks] = useState([])
  const relevantBlocks = useRef([])
  
  const processBlock = useCallback((block) => {

  }, [])
  useEffect(() => {
    if (!appStateSnapshot.chain.id || !appStateSnapshot.account) {
      return
    }
    const getEventObserver = (type) => ({
      next(block) {
        const blockData = { block, callback: "next", type };
        import.meta.env.DEV && console.log(blockData)
        relevantBlocks.current.push(block)
        processBlock(blockData)
      },
      error(error) {
        import.meta.env.DEV && console.error({ error: error.message, callback: "error", type })
        import.meta.env.DEV && console.error(error)
      },
      complete(data) {
        import.meta.env.DEV && console.log({ data, callback: "complete", type })
      }
    })

    const IdSetSub = typedApi.event.Identity.IdentitySet.watch()
      .subscribe(getEventObserver("Identity.IdentitySet"))
    const IdClearedSub = typedApi.event.Identity.IdentityCleared.watch()
      .subscribe(getEventObserver("Identity.IdentityCleared"))
    const JudgememtRequestedSub = typedApi.event.Identity.JudgementRequested.watch()
      .subscribe(getEventObserver("Identity.JudgementRequested"))
    const JudgememtGivenSub = typedApi.event.Identity.JudgementGiven.watch()
      .subscribe(getEventObserver("Identity.JudgementGiven"))

    let extrinsicsSubscription: PushSubscription;

    const startSubscription = () => {
      extrinsicsSubscription = chainClient.bestBlocks$
        .pipe(
          mergeMap((blocks) =>
            Promise.all(
              blocks.map((block) =>
                unstable_getBlockExtrinsics(chainClient, typedApi, block.hash).then(
                  (extrinsics) => ({ block, extrinsics }),
                ),
              ),
            ),
          ),
        )
        .subscribe({
          next: (blocks) => {
            const newBlocks = new Map(blocks);

            for (const block of blocks) {
              if (block.extrinsics && block.block.hash) {
                newBlocks.set(block.block.hash, block.extrinsics);
              }
              const _block = relevantBlocks.current.find(
                (__block) => block.block.hash === __block.meta.block.hash
              );
              if (_block) {
                _block.extrinsics = block.extrinsics
                processBlock({ block: _block, type: "extrinsics" });
                import.meta.env.DEV && console.log({_block, block, relevantBlocks});
              }
            }

            import.meta.env.DEV && console.log({newBlocks});
          },
          error: (error) => {
            import.meta.env.DEV && console.error("block error", error);
            return startSubscription();
          },
        });
    };

    startSubscription();
    
    import.meta.env.DEV && console.log("Chain events subscription")
    
    return () => {
      IdSetSub.unsubscribe()
      IdClearedSub.unsubscribe()
      JudgememtRequestedSub.unsubscribe()
      JudgememtGivenSub.unsubscribe()
      extrinsicsSubscription.unsubscribe();
      
      import.meta.env.DEV && console.log("Chain events unsubscription")
    }
  }, [appStateSnapshot.chain.id, appStateSnapshot.account, processBlock])

  const timer = useRef();
  useEffect(() => {
    (async () => {
      if (appStateSnapshot.chain.id) {
        const chainSpecData = await chainClient._request("system_properties");
        import.meta.env.DEV && console.log({ chainSpecData, })
        appState.chain = { ...appStateSnapshot.chain, ...chainSpecData }
      }
    }) ()
  }, [appStateSnapshot.chain.id])

  useEffect(() => {
    if (appStateSnapshot.account) {
      timer.current = setInterval(async () => {
        const accData = await typedApi.query.System.Account.getValue(appStateSnapshot.account.address)
        const existentialDep = await typedApi.constants.Balances.ExistentialDeposit()
        import.meta.env.DEV && console.log({
          "System.Account": accData,
          "Balances.ExistentialDeposit": existentialDep,
        })
        appState.account.balance = accData.data
      }, CHAIN_UPDATE_INTERVAL)
      return () => {
        clearInterval(timer.current);
      }
    }
  }, [appStateSnapshot.account, appStateSnapshot.chain.id])

  const accounts = useAccounts()
  useEffect(() => {
    let account = localStorage.getItem("account");
    if (!account || accounts.length < 1) {
      return;
    }
    account = JSON.parse(account);
    const _account = accounts.find(ac => account.address === ac.address);
    account = { ...account, ..._account }
    import.meta.env.DEV && console.log({ account, })
    appState.account = account
  }, [accounts])

  return <>
    <Router>
      <Routes>
        {routes.map((route) => (
          <Route
            path={route.path}
            key={route.path}
            element={<DomTitle route={route} />}
          />
        ))}
      </Routes>
    </Router>
    <ConnectionDialog open={appStateSnapshot.walletDialogOpen} 
      onClose={() => { appState.walletDialogOpen = false }} 
    />
  </>;
}
