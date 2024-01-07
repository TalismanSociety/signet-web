import { useMemo } from 'react'
import { AbiParam } from '@polkadot/api-contract/types'
import { Registry } from '@polkadot/types/types'
import { encodeTypeDef } from '@polkadot/types/create'
import { Chain } from '@domains/chains'
import { Bool } from './param-input/Bool'
import { AddressParamInput } from './param-input/Address'
import { ParamInputComponent } from './param-input/param-input.types'
import { StringParamInput } from './param-input/String'
import { AmountParamInput } from './param-input/Amount'
import { HashParamInput } from './param-input/Hash'

type Props = {
  chain: Chain
  params: AbiParam[]
  onChange: (params: any[]) => void
  registry: Registry
  value: { value: any; valid: boolean }[]
}

const Comp = ({
  chain,
  index,
  onChange,
  param,
  registry,
  value,
}: {
  chain: Chain
  onChange: (param: any) => void
  param: AbiParam
  index: number
  registry: Registry
  value?: { value: any; valid: boolean }
}) => {
  const typeString = useMemo(() => encodeTypeDef(registry, param.type), [param.type, registry])

  const InputComp: ParamInputComponent<any> = useMemo(() => {
    switch (typeString) {
      case 'bool':
        return Bool
      case 'AccountId':
      case 'Address':
      case 'LookupSource':
      case 'MultiAddress':
        return AddressParamInput
      case 'AccountIndex':
      case 'i8':
      case 'i16':
      case 'i32':
      case 'i64':
      case 'i128':
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
      case 'Amount':
      case 'Balance':
      case 'BalanceOf':
        return AmountParamInput
      case 'Text':
      case 'String':
        return StringParamInput
      case 'Hash':
      case 'H256':
        return HashParamInput
      default:
        return (props: any) => (
          <div>
            <p className="text-[14px] italic mb-[4px]">
              <b>{typeString}</b> type not supported yet
            </p>
            <StringParamInput {...props} placeholder={`Enter input for ${typeString}`} />
          </div>
        )
    }
  }, [typeString])

  return (
    <div>
      <p className="mb-[4px] text-[14px]">
        {param.name}: <span className="text-offWhite">{typeString}</span>
      </p>
      <InputComp arg={value} onChange={onChange} id={`arg-${index}`} param={param} chain={chain} />
    </div>
  )
}

export const AbiParamsForm: React.FC<Props> = ({ chain, params, onChange, registry, value }) => {
  if (params.length === 0) return null
  return (
    <div className="grid gap-[16px]">
      {params.map((param, index) => (
        <Comp
          key={index}
          chain={chain}
          param={param}
          index={index}
          registry={registry}
          value={value[index]}
          onChange={newVal => {
            const newValue = [...value]
            newValue[index] = newVal
            onChange(newValue)
          }}
        />
      ))}
    </div>
  )
}
