import Logo from '@components/Logo'
import { accountsState, extensionAllowedState, extensionLoadingState } from '@domains/extension'
import { useNavigate } from 'react-router-dom'
import { atom, useRecoilState } from 'recoil'

import Footer from '../Footer'
import { Button } from '@components/ui/button'
import { AppMockup } from './AppMockup'
import Logomark from '@components/Logomark'
import { ArrowUpRight } from 'lucide-react'
import { useEffect } from 'react'
import { CONFIG } from '@lib/config'
import { PolkadotMultisigLogo } from '@components/Logo/PolkadotMultisig'
import { cn } from '@util/tailwindcss'
import PolkadotMultisigMockup from './PolkadotMultisigMockup'

const shouldRedirectToDashboardState = atom({
  key: 'shouldRedirectToDashboardKey',
  default: window.location.pathname === '/',
})

const Landing: React.FC<{ disableRedirect?: boolean }> = ({ disableRedirect }) => {
  const [extensionAccounts] = useRecoilState(accountsState)
  const [extensionLoading] = useRecoilState(extensionLoadingState)
  const [extensionAllowed, setExtensionAllowed] = useRecoilState(extensionAllowedState)
  const [shouldRedirect, setShouldDirect] = useRecoilState(shouldRedirectToDashboardState)
  const navigate = useNavigate()

  useEffect(() => {
    if (!disableRedirect && shouldRedirect && extensionAccounts.length > 0) {
      setShouldDirect(false)
      navigate('/overview')
    }
  })

  return (
    <main className="min-h-screen w-full flex flex-col flex-1 h-full relative bg-gray-950">
      <header className="flex items-center justify-between w-full p-[24px] md:px-[80px] fixed top-0 z-20 lg:bg-transparent bg-gray-950">
        {CONFIG.IS_POLKADOT_MULTISIG ? (
          <>
            <PolkadotMultisigLogo className="hidden sm:block" />
            <PolkadotMultisigLogo className="block sm:hidden max-w-[120px]" wrapped />
          </>
        ) : (
          <Logo className="w-[106px]" />
        )}
        {extensionAccounts.length > 0 ? (
          <Button asLink to="/overview">
            Go to Dashboard
          </Button>
        ) : (
          <Button
            disabled={extensionAllowed || extensionLoading}
            loading={extensionLoading}
            onClick={() => setExtensionAllowed(true)}
            className="px-[16px] min-h-[48px] h-[48px] lg:px-[32px] lg:h-[56px] lg:min-h-[56px]"
          >
            {!extensionAllowed || extensionLoading ? 'Connect Wallet' : 'No Accounts Connected'}
          </Button>
        )}
      </header>
      <div className="flex items-center flex-col lg:flex-row">
        <div className="w-full px-[24px] md:pl-[80px] pb-[64px] pt-[104px] lg:py-[128px] h-full flex flex-col my-auto lg:w-[60%] min-h-[70vh] lg:min-h-screen lg:h-full justify-center">
          {CONFIG.IS_POLKADOT_MULTISIG ? (
            <>
              <h1 className="leading-[1] text-[32px] sm:text-[48px] font-bold text-offWhite">
                The <span className="">Multisig</span> for the{' '}
                <span className="sm:whitespace-nowrap">Polkadot ecosystem</span>
              </h1>
              <p className="text-gray-200 mt-[20px] lg:mt-[32px] text-[16px] lg:text-[18px] max-w-[480px]">
                Powered by <span className="text-offWhite">Signet</span>, Talisman's Multisig Solution for Enterprise.
                Based on the Proxy & Multisig pallets, create new Multisigs or load existing. Connect your wallet to get
                started.
              </p>
            </>
          ) : (
            <>
              <Logomark className="w-[32px] h-[32px] lg:w-[40px] lg:h-[40px] mb-[24px]" />
              <h1 className="leading-[1] text-[48px] lg:text-[64px] font-bold text-primary whitespace-nowrap">
                {extensionAccounts.length > 0 ? 'Welcome Back' : 'Sign-in'}
              </h1>
              <p className="text-gray-200 mt-[20px] lg:mt-[32px] text-[16px] lg:text-[18px]">
                Sign in with your whitelisted account or find out more at <br className="hidden lg:block" />
                <a className="text-offWhite" href={`mailto:${CONFIG.CONTACT_EMAIL}`} target="_blank" rel="noreferrer">
                  {CONFIG.CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-gray-200 mt-[20px] lg:mt-[32px] text-[16px] lg:text-[18px]">
                Alternatively, try the community version{' '}
                <a
                  className="text-offWhite hover:text-gray-200"
                  href="https://polkadotmultisig.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Polkadot Multisig
                </a>
              </p>
            </>
          )}
          {extensionAccounts.length > 0 ? (
            <Button className="mt-[24px]" asLink to="/overview">
              Go to Dashboard
            </Button>
          ) : CONFIG.IS_POLKADOT_MULTISIG ? (
            <Button
              disabled={extensionAllowed || extensionLoading}
              loading={extensionLoading}
              onClick={() => setExtensionAllowed(true)}
              className="w-max mt-[24px] lg:mt-[32px] group"
            >
              {!extensionAllowed || extensionLoading ? 'Connect Wallet' : 'No Accounts Connected'}
            </Button>
          ) : (
            <Button
              className="w-max mt-[24px] lg:mt-[32px] group"
              variant="outline"
              asLink
              to={CONFIG.SIGNET_LANDING_PAGE}
              target="_blank"
            >
              <div className="flex items-center gap-[8px]">
                <span>Get Early Access</span>
                <ArrowUpRight className="text-primary group-hover:text-black" height={20} width={20} />
              </div>
            </Button>
          )}
        </div>

        <div
          className={cn(
            'flex flex-1 w-full pt-[28px] pl-[28px] z-10 relative lg:top-1/2 lg:translate-y-[-50%] lg:pl-[68px] lg:w-[40%] lg:py-[104px] lg:h-full',
            CONFIG.IS_POLKADOT_MULTISIG ? 'bg-[#74163F]' : 'bg-[#FD4848]'
          )}
        >
          {CONFIG.IS_POLKADOT_MULTISIG ? (
            <>
              <PolkadotMultisigMockup />
              <div className="absolute w-full h-full flex-1 z-0 top-0 left-0 overflow-hidden">
                <div className="w-[232px] h-[232px] absolute bg-[#DD186E] rounded-full -top-[10%] -left-[12%]" />
                <div className="w-[295px] h-[295px] absolute bg-[#DD186E] rounded-full -right-[8%] top-[8px]" />
                <div className="w-[78px] h-[78px] absolute bg-[#DD186E] rounded-full bottom-[16%] right-[12%]" />
                <div className="w-[437px] h-[437px] absolute bg-[#DD186E] rounded-full -left-[20%] top-[72%]" />
              </div>
            </>
          ) : (
            <>
              <AppMockup />
              <div className="absolute w-full h-full flex-1 z-0 top-0 left-0 overflow-hidden">
                <svg
                  className="transform translate-x-[-25%] translate-y-[-25%] w-[2000px] h-auto"
                  width="1851"
                  height="1761"
                  viewBox="0 0 1851 1761"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1824.08 713.041L1775.5 563.52L1384.7 679.547C1202.82 733.548 1019.26 600.184 1014.41 410.515L1004 2.99115H846.782L836.368 410.515C831.521 600.184 647.961 733.548 466.077 679.547L75.2809 563.52L26.6986 713.041L411.059 848.877C589.946 912.098 660.06 1127.89 552.497 1284.18L321.386 1619.99L448.576 1712.4L696.538 1388.83C811.944 1238.24 1038.84 1238.24 1154.24 1388.83L1402.2 1712.4L1529.39 1619.99L1298.28 1284.18C1190.72 1127.89 1260.83 912.098 1439.72 848.877L1824.08 713.041Z"
                    fill="#FD6868"
                    stroke="#FD6868"
                    strokeWidth="157.267"
                  />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="w-full relative z-20">
        <div className="pt-[16px] w-full lg:translate-y-[-100%] lg:absolute">
          <Footer darkTalisman={!CONFIG.IS_POLKADOT_MULTISIG} />
        </div>
      </div>
    </main>
  )
}

export default Landing
