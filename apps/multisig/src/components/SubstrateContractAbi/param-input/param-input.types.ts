import { Chain } from '@domains/chains'
import { AbiParam } from '@polkadot/api-contract/types'

type Props<T, OtherProps> = {
  chain: Chain
  id: string
  param: AbiParam
  onChange: (change: { value: T; valid: boolean }) => void
  arg?: { value: T; valid: boolean }
} & OtherProps

export type ParamInputComponent<ValueType, OtherProps = {}> = React.FC<Props<ValueType, OtherProps>>
