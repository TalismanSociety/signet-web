import { Chain } from '../domains/chains'

type Props = {
  chain: Chain
  identiconSize?: number
}

export const ChainPill: React.FC<Props> = ({ chain, identiconSize = 24 }) => {
  return (
    <div className="flex items-center gap-[8px]">
      <img style={{ height: identiconSize }} src={chain.logo} alt={chain.chainName} />
      <p className="mt-[4px] text-ellipsis overflow-hidden">{chain.chainName}</p>
    </div>
  )
}
