import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App, { appState } from './App'
import 'uno.css'
import '@unocss/reset/tailwind-compat.css'
import { ChainProvider, ReactiveDotProvider } from '@reactive-dot/react'
import { RpcWebSocketProvider } from './api/WebSocketClient'
import { configStore, initWorker } from './api/config2'
import { useSnapshot } from 'valtio'


const Main: React.FC = () => {
  const configStoreSnap = useSnapshot(configStore)
  const appStateSnap = useSnapshot(appState)

  useEffect(() => {
    console.log({ configStoreSnap })
    if (configStoreSnap.worker) return;
    if (configStoreSnap.config) {
      appState.chain = Object.keys(configStoreSnap.chains)[0]
    } else {
      initWorker()
    }
  }, [configStoreSnap])
  
  return <React.StrictMode>
    {configStoreSnap.config 
      && <ReactiveDotProvider config={configStoreSnap.config}>
        <RpcWebSocketProvider>
          <ChainProvider chainId={configStoreSnap.config[appStateSnap.chain]}>
            <div className='dark:bg-black min-h-0px'>
              <App />
            </div>
          </ChainProvider>
        </RpcWebSocketProvider>
      </ReactiveDotProvider>
    }
  </React.StrictMode>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Main />
)
