import type React from 'react'
import { lazy } from 'react'
import Home from '~/pages/home'

const About = lazy(() => import('~/pages/about'))
const ErrorPage = lazy(() => import('~/pages/error-page'))

export interface RouteType {
  path: string
  element: React.FC
  meta?: {
    title: string
  }
}

const routes: RouteType[] = [
  {
    path: '/',
    element: Home,
    meta: {
      title: 'Home'
    }
  },
  {
    path: '/about',
    element: About,
    meta: {
      title: 'About'
    }
  },
  {
    path: '*',
    element: ErrorPage,
    meta: {
      title: 'Page not found'
    }
  }
]

export { routes }
