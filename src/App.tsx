import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import type { RouteType } from '~/routes';
import { routes } from '~/routes';

import { config } from "./api/config";
import { ChainProvider, ReactiveDotProvider } from "@reactive-dot/react";


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

export default function App() {
  return (
    <ReactiveDotProvider config={config}>
      <ChainProvider chainId="people_rococo">
        <Suspense>
          <div className='dark:bg-black min-h-0px'>
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
          </div>
        </Suspense>
      </ChainProvider>
    </ReactiveDotProvider>
  );
}
