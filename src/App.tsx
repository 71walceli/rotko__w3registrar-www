import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { Suspense, createContext, useEffect } from 'react';
import type { RouteType } from '~/routes';
import { routes } from '~/routes';

import { config } from "./api/config";
import { proxy, useSnapshot } from 'valtio';

import { ConnectionDialog } from "dot-connect/react.js";
import { useAccounts, useTypedApi } from '@reactive-dot/react';
import { PolkadotSigner } from 'polkadot-api';
import { CHAIN_UPDATE_INTERVAL } from './Constantx';


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
  chain: string,
  walletDialogOpen: boolean,
  account?: {
    id: string,
    name: string,
    address: string,
    polkadotSigner: PolkadotSigner;
  },
  identity?: {
    displayName: string,
    matrix: string,
    discord: string,
    email: string,
    twitter: string,
  },
  stage: number,
  challenges: Record<string, {
    value: string,
    verified: boolean,
  }>
} = proxy({
  chain: Object.keys(config.chains)[0],
  walletDialogOpen: false,
  stage: 0,
  challenges: {
    matrix: { value: '', verified: false },
    email: { value: '', verified: false },
    discord: { value: '', verified: false },
    twitter: { value: '', verified: false }
  }
})

export const AppContext = createContext({})

export default function App() {
  const typedApi = useTypedApi({ chainId: "people_rococo" })

  useEffect(() => {
    if (appState.account?.address) {
      typedApi.query.Identity.IdentityOf.getValue(appState.account?.address)
        .then(identityOf => {
          const identityData = Object.fromEntries(Object.entries(identityOf[0].info)
            .filter(([_, value]) => value?.type?.startsWith("Raw"))
            .map(([key, value]) => [key, value.value.asText()])
          );
          console.log({
            identityOf,
            value: identityData
          })
          appState.identity = identityData
        })
        .catch(e => {
          console.error("Couldn't get identityOf")
          console.error(e)
        })
    }
  }, [appState.account?.address])

  const appStateSnapshot = useSnapshot(appState)
  
  useEffect(() => {
    if (appStateSnapshot.account) {
      const timer = setInterval(() => {
          typedApi.query.System.Account.getValue(appStateSnapshot.account.address)
            .then(data => {
              console.log({
                "System.Account": data
              })
            })
        return () => clearInterval(timer)
      }, CHAIN_UPDATE_INTERVAL)
    }
  }, [appStateSnapshot.account])

  const accounts = useAccounts()
  useEffect(() => {
    let account = localStorage.getItem("account");
    if (!account || accounts.length < 1) {
      return;
    }
    account = JSON.parse(account);
    console.log({ account, })
    account.polkadotSigner = (accounts.find(ac => account.address === ac.address))?.polkadotSigner
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
