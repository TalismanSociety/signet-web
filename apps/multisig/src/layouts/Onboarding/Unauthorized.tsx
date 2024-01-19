import Header from '../../layouts/Header'

export const Unauthorized: React.FC = () => (
  <main className="w-full h-screen p-[24px]">
    <Header />
    <section className="px-[16px] py-[32px]">
      <div className="flex flex-col items-center justify-center p-[16px] lg:p-[32px] bg-gray-800 mx-auto rounded-[24px] max-w-[560px]">
        <h1 className="text-[24px] font-bold">Unauthorized</h1>
        <p className="text-center my-[16px]">
          Please sign in again. You can do that by disconnecting your wallet and connecting it again.
        </p>
      </div>
    </section>
  </main>
)
