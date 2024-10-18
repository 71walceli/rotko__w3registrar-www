import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { Suspense, createContext, useEffect } from 'react';
import type { RouteType } from '~/routes';
import { routes } from '~/routes';

import { config } from "./api/config";
import { proxy, useSnapshot } from 'valtio';

import { useRpcWebSocketProvider } from './api/WebSocketClient';

import { ConnectionDialog } from "dot-connect/react.js";


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
  const appStateSnapshot = useSnapshot(appState)
  useRpcWebSocketProvider()

  useEffect(() => {
    const account = localStorage.getItem("account");
    if (!account) {
      return;
    }
    appState.account = JSON.parse(account)
  }, [])

  const {api} = useRpcWebSocketProvider()

  useEffect(() => {
    console.log({ api, address: appStateSnapshot.account?.address })
    if (!appStateSnapshot.account?.address || !api) {
      return;
    }
    api.query.identity.identityOf(appStateSnapshot.account.address).then(response => {
      const value = response.toJSON();
      function decodeHex(hex: string) {
        return decodeURIComponent('%' + hex.substring(2).match(/.{1,2}/g).join('%'));
      }
      const identity = Object.entries(value?.[0]?.info).filter(([, value]) => value?.raw)
        .reduce((all, [key, { raw }]) => {
          all[key] = decodeHex(raw);
          return all;
        }, {});

      console.log({ 
        identityOf: value,
        identity: identity
      })
    })
  }, [appStateSnapshot.account?.address, api])

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
