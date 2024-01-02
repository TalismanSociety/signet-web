import * as SentryReact from '@sentry/react'
import React from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'

const sensitiveData: Record<string, true> = {
  jwtToken: true,
}

const removeSensitiveDataFromObj = (obj: any) => {
  for (let key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      removeSensitiveDataFromObj(obj[key])
    } else if (sensitiveData[key]) {
      delete obj[key]
    }
  }

  return obj
}

export const initSentry = (sentry: typeof SentryReact) => {
  sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    integrations: [
      new sentry.BrowserTracing({
        routingInstrumentation: sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    beforeSend: removeSensitiveDataFromObj,
    tracesSampleRate: 0.5,
  })
}
