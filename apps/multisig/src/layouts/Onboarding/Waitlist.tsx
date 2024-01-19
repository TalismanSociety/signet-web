import { Button } from '@components/ui/button'
import Header from '../../layouts/Header'
import Footer from '../../layouts/Footer'

export const Waitlist: React.FC = () => (
  <main className="w-full min-h-screen p-[24px] h-full flex flex-1 flex-col">
    <Header />
    <section className="lg:px-[16px] py-[20vh] h-full flex flex-1">
      <div className="flex flex-col items-center justify-center px-[32px] py-[32px] lg:p-[32px] bg-gray-800 mx-auto rounded-[24px] max-w-[560px] h-max">
        <h1 className="text-[28px] lg:text-[32px] font-bold text-center">You're on waitlist!</h1>
        <p className="text-center my-[16px]">
          You will be able to use Signet once we accept your address into the address.
        </p>
        <h4 className="text-offWhite font-bold text-[16px] text-center mt-[32px]">Want to move up the waitlist?</h4>
        <p className="text-center mb-[32px]">Skip the queue by filling a reach out form.</p>
        <Button asLink to="https://talisman.xyz/signet" target="_blank">
          Skip Waitlist
        </Button>
      </div>
    </section>
    <Footer />
  </main>
)
