const Footer = () => {
  return (
    <footer className="flex-col md:flex-row flex items-center justify-center md:justify-between gap-[12px] md:gap-[16px] px-[16px] pb-[16px] lg:px-[96px]">
      <div className="flex items-center gap-x-[16px] gap-y-[6px] [&>p]:!text-center [&>a]:text-center [&>p]:!text-[14px] [&>a]:text-[14px] [&>a]:text-offWhite flex-wrap justify-center">
        <p>Signet (Beta)</p>
        <a href="https://twitter.com/wearetalisman" target="_blank" rel="noreferrer">
          Twitter
        </a>
        <a href="https://discord.gg/talisman" target="_blank" rel="noreferrer">
          Discord
        </a>
        <a
          href="https://docs.talisman.xyz/talisman/prepare-for-your-journey/terms-of-use"
          target="_blank"
          rel="noreferrer"
        >
          Terms
        </a>
        <a
          href="https://docs.talisman.xyz/talisman/prepare-for-your-journey/privacy-policy"
          target="_blank"
          rel="noreferrer"
        >
          Privacy Policy
        </a>
      </div>
      <div className="group [&>a]:transition-all [&>a]:duration-300 [&>a]:text-[14px] hover:scale-105 transition-all duration-300">
        <a
          className="bg-clip-text bg-gradient-to-r from-[#ed726d] to-[#ee94f9] group-hover:text-[transparent]"
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
          className="bg-clip-text bg-gradient-to-r from-[#918ff8] to-[#cefd9c] group-hover:text-[transparent]"
          href="https://talisman.xyz"
          target="_blank"
          rel="noreferrer"
        >
          {'by Talisman'}
        </a>
      </div>
    </footer>
  )
}

export default Footer
