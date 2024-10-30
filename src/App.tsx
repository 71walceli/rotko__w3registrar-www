import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import type { RouteType } from '~/routes';
import { routes } from '~/routes';

import { config } from "./api/config";
import { proxy, useSnapshot } from 'valtio';

import { ConnectionDialog } from "dot-connect/react.js";
import { useAccounts, useClient, useTypedApi } from '@reactive-dot/react';
import { PolkadotSigner } from 'polkadot-api';
import { CHAIN_UPDATE_INTERVAL, IDENTITY_VERIFICATION_STATE } from './constants';
import { useIdentityEncoder } from './hooks/hashers/identity';
import { IdentityJudgement } from '@polkadot-api/descriptors';


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
    state: IdentityJudgement,
    fee: bigint,
  }>
  stage: number,
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
  verificationProgress: number,
} = proxy({
  chain: { 
    id: import.meta.env.VITE_APP_DEFAULT_CHAIN || Object.keys(config.chains)[0],
  },
  walletDialogOpen: false,
  stage: 0,
  challenges: {
    matrix: { value: '', verified: false },
    email: { value: '', verified: false },
    discord: { value: '', verified: false },
    twitter: { value: '', verified: false }
  },
  hashes: {},
  verificationProgress: IDENTITY_VERIFICATION_STATE.Unknown,
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
          const identityOf = result[0]
          if (!identityOf) {
            appState.verificationProgress = IDENTITY_VERIFICATION_STATE.NoIdentity
            return;
          }

          const identityData = Object.fromEntries(Object.entries(identityOf.info)
            .filter(([_, value]) => value?.type?.startsWith("Raw"))
            .map(([key, value]) => [key, value.value.asText()])
          );
          appState.identity = identityData
          appState.verificationProgress = IDENTITY_VERIFICATION_STATE
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

          const idDeposit = identityOf.deposit
          appState.reserves = { ...appStateSnapshot.reserves, identity: idDeposit }

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
