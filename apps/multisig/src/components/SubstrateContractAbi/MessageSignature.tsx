import { Chain } from '@domains/chains'
import { useApi } from '@domains/chains/pjs-api'
import { AbiMessage } from '@polkadot/api-contract/types'
import { encodeTypeDef } from '@polkadot/types/create'
import { Skeleton } from '@talismn/ui'

type Props = {
  message: AbiMessage
  chain: Chain
  withoutDocs?: boolean
}

export const MessageSignature: React.FC<Props> = ({ message, chain, withoutDocs }) => {
  const { api } = useApi(chain.genesisHash)
  if (!api) return <Skeleton.Surface className="w-[120px] h-[20px]" />
  return (
    <div className="w-full overflow-hidden text-left">
      <p className="text-[14px]">
        <span className="text-primary font-medium">{message.method}</span>
        <span className="text-offWhite">
          (
          {message.args.map((arg, index) => (
            <span className="text-offWhite" key={index}>
              {arg.name}: <span className="text-gray-200">{encodeTypeDef(api.registry, arg.type)}</span>
              {index < message.args.length - 1 && ', '}
            </span>
          ))}
          )
          {!message.isConstructor && message.returnType && (
            <>
              :{' '}
              <span className="text-orange-500">
                {encodeTypeDef(api.registry, message.returnType).replaceAll(', ', ',').replaceAll(',', ', ')}
              </span>
            </>
          )}
        </span>
      </p>
      {!withoutDocs && (
        <p className="text-gray-300 overflow-hidden break-all whitespace-normal text-[12px] mt-[4px]">
          {message.docs.join('') || 'No documentation provided.'}
        </p>
      )}
    </div>
  )
}
