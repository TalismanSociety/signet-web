import Logo from '@components/Logo'
import { Skeleton } from '@talismn/ui'
import Footer from './Footer'

export const SkeletonLayout: React.FC = () => (
  <main className="w-screen h-full min-h-screen p-[24px] flex flex-col gap-[16px] flex-1">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-[12px]">
        <Logo css={{ cursor: 'pointer', width: 106, marginRight: 16 }} />
        <Skeleton.Surface className="w-[211px] h-[59.2px]" />
      </div>
      <Skeleton.Surface className="h-[56.2px] min-w-[212px]" />
    </header>
    <section className="flex items-center gap-[16px] h-full">
      <Skeleton.Surface className="h-full w-[64px] lg:w-[204.58px]" />
      <div className="flex flex-1 flex-col lg:flex-row h-full gap-[16px]">
        <div className="w-full lg:w-[38%] flex flex-col gap-[16px] h-4/5 lg:h-full">
          <Skeleton.Surface className="h-full w-full" />
          <Skeleton.Surface className="h-full w-full" />
        </div>
        <Skeleton.Surface className="h-1/5 lg:h-full w-full lg:w-[62%]" />
      </div>
    </section>
    <Footer />
  </main>
)
