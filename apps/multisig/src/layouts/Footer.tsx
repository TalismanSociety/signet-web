import { cn } from '@util/tailwindcss'
import { CONFIG } from '@lib/config'
import { SignetLogo } from '@components/Logo/SignetLogo'

const Footer: React.FC<{ darkTalisman?: boolean }> = ({ darkTalisman }) => {
  return (
    <footer className="flex-col md:flex-row flex items-start md:items-center justify-center md:justify-between gap-[12px] md:gap-[16px] px-[16px] pb-[24px] lg:px-[96px]">
      <div className="flex items-center gap-x-[12px] [&>a]:text-center [&>a]:text-[14px] [&>a]:text-offWhite ">
        <a className="text-offWhite hover:text-gray-200" href={CONFIG.SIGNET_LANDING_PAGE}>
          Signet (Beta)
        </a>
        <a className="hover:text-gray-200" href="https://guide.polkadotmultisig.com" target="_blank" rel="noreferrer">
          Guide
        </a>
        <a className="hover:text-gray-200" href="https://t.me/signetmsig" target="_blank" rel="noreferrer">
          Contact
        </a>
        <a
          className="hover:text-gray-200"
          href="https://github.com/TalismanSociety/signet-web"
          target="_blank"
          rel="noreferrer"
        >
          Github
        </a>
        <a className="hover:text-gray-200" href={CONFIG.TERMS} target="_blank" rel="noreferrer">
          Terms
        </a>
        <a className="hover:text-gray-200" href={CONFIG.PRIVACY_POLICY} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
      </div>
      {CONFIG.IS_POLKADOT_MULTISIG ? (
        <a
          className="flex items-center gap-[8px] hover:opacity-80"
          target="_blank"
          rel="noopener noreferrer"
          href={CONFIG.SIGNET_LANDING_PAGE}
        >
          <p className={cn(darkTalisman ? 'lg:text-gray-900' : '', 'text-offWhite text-[14px] text-center')}>
            Powered by{' '}
          </p>
          <SignetLogo className={cn('min-w-[80px]', darkTalisman ? 'text-offWhite lg:text-gray-900' : '')} />
        </a>
      ) : (
        <div className="flex items-center justify-center gap-[24px]">
          <a
            className={cn(
              darkTalisman ? 'text-offWhite lg:text-gray-900' : '',
              'hover:opacity-80 text-[14px] text-center'
            )}
            href={CONFIG.SIGNET_LANDING_PAGE}
          >
            Signet (Beta)
          </a>
          <div className="group [&>a]:transition-all [&>a]:duration-300 [&>a]:text-[14px] hover:scale-105 transition-all duration-300">
            <a
              className={cn(
                darkTalisman ? 'lg:text-gray-900 lg:group-hover:text-gray-950' : 'group-hover:text-[transparent]',
                'bg-clip-text bg-gradient-to-r from-[#ed726d] to-[#ee94f9] group-hover:text-[transparent]'
              )}
              href="https://talisman.xyz"
              target="_blank"
              rel="noreferrer"
            >
              {'Made with'}
            </a>
            <a className="bg-clip-text" href="https://talisman.xyz" target="_blank" rel="noreferrer">
              {' ♥️ '}
            </a>
            <a
              className={cn(
                darkTalisman ? 'lg:text-gray-800 lg:group-hover:text-gray-950' : 'group-hover:text-[transparent]',
                'bg-clip-text bg-gradient-to-r from-[#918ff8] to-[#cefd9c] group-hover:text-[transparent]'
              )}
              href="https://talisman.xyz"
              target="_blank"
              rel="noreferrer"
            >
              {'by Talisman'}
            </a>
          </div>
        </div>
      )}
    </footer>
  )
}

export default Footer
