import * as Sentry from '@sentry/react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initSentry } from './util/sentry'

initSentry(Sentry)

const ProfiledApp = Sentry.withProfiler(App)

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <ProfiledApp />
  </React.StrictMode>
)
