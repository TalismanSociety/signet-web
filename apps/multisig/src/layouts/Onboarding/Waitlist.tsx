import { Button } from '@components/ui/button'
import Header from '../../layouts/Header'
import Footer from '../../layouts/Footer'

export const Waitlist: React.FC = () => (
  <main className="w-full min-h-screen p-[24px] h-full flex flex-1 flex-col">
    <Header />
    <section className="lg:px-[16px] py-[20vh] h-full flex flex-1">
      <div className="flex flex-col items-center justify-center px-[32px] py-[32px] lg:p-[32px] bg-gray-800 mx-auto rounded-[24px] max-w-[560px] h-max">
        <h1 className="text-[24px] lg:text-[32px] font-bold text-center">Account not whitelisted</h1>
        <p className="text-center my-[16px]">
          Sign up to get early access to Signet, we will get in touch when your account has been whitelisted.
        </p>
        <Button asLink to={process.env.REACT_APP_SIGNET_LANDING_PAGE ?? ''} target="_blank">
          Get Early Access
        </Button>
      </div>
    </section>
    <Footer />
  </main>
)
