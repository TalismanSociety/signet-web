import { useRecoilState, useRecoilValue } from 'recoil'
import { accountsState, extensionAllowedState } from '@domains/extension'
import Landing from '../Landing'
import { selectedAccountState } from '@domains/auth'
import SignInPage from './SignInPage'
import { useTeamFromUrl } from '@domains/offchain-data'
import { useMe } from '@domains/auth/useMe'
import { Waitlist } from '../../layouts/Onboarding/Waitlist'
import { SkeletonLayout } from '../../layouts/SkeletonLayout'
import { Unauthorized } from '../../layouts/Onboarding/Unauthorized'
import { extensionLoadingState } from '../../domains/extension/index'

type Props = {
  requireSignIn?: boolean
}

/**
 * A wrapper component for pages that require some extension accounts to be connected.
 * Also allows checking if a multisig is required to be connected.
 * */
const RequireAuth: React.FC<React.PropsWithChildren & Props> = ({ children, requireSignIn }) => {
  const [extensionAccounts] = useRecoilState(accountsState)
  const loadingExtension = useRecoilValue(extensionLoadingState)
  const allowed = useRecoilValue(extensionAllowedState)
  const signedInAccount = useRecoilValue(selectedAccountState)
  const { user, loading } = useMe()
  useTeamFromUrl()

  // show landing page for connection if not accounts connected
  if (extensionAccounts.length === 0) {
    if (allowed || loadingExtension) return <SkeletonLayout />
    return <Landing disableRedirect />
  }

  if (requireSignIn) {
    if (!signedInAccount) return <SignInPage accounts={extensionAccounts} />
    if (loading) return <SkeletonLayout />
    if (!user) return <Unauthorized />
    if (!user.whitelisted) return <Waitlist />
  }

  if (requireSignIn && !signedInAccount) return <SignInPage accounts={extensionAccounts} />

  return <>{children}</>
}

export default RequireAuth
