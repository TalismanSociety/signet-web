import { Button } from '@components/ui/button'
import Header from '../../layouts/Header'
import { useSignIn, useUser } from '@domains/auth'

export const Unauthorized: React.FC = () => {
  const { signIn, signingIn } = useSignIn()
  const { user } = useUser()
  return (
    <main className="w-full h-screen p-[24px]">
      <Header />
      <section className="px-[16px] py-[32px]">
        <div className="flex flex-col items-center justify-center p-[16px] lg:p-[32px] bg-gray-800 mx-auto rounded-[24px] max-w-[560px]">
          <h1 className="text-[24px] font-bold">There's been a problem</h1>
          <p className="text-center my-[16px]">Please sign in again to continue using Signet.</p>
          {user && (
            <Button onClick={() => signIn(user.injected, true)} loading={signingIn}>
              Sign In
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
