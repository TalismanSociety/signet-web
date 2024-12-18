import { useEffect } from 'react'
import { Loadable, useRecoilState, useRecoilValue } from 'recoil'
import TokensSelect from '@components/TokensSelect'
import { BaseToken, Chain } from '@domains/chains'
import AmountRow from '@components/AmountRow'
import BN from 'bn.js'
import { Alert } from '@components/Alert'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { MultiSendTable } from './MultisendTable'
import { multisendTokenAtom } from './MultisendTable/atom'
import { useSelectedMultisig } from '@domains/multisig'
import { userOrganisationsState } from '@domains/offchain-data'
import { CONFIG } from '@lib/config'

const MultiSendForm = (props: {
  name: string
  tokens: Loadable<BaseToken[]>
  setName: (n: string) => void
  onNext: () => void
  hasNonDelayedPermission?: boolean
  hasDelayedPermission?: boolean
  chain: Chain
  totalAmount: BN
  totalSends: number
  disabled: boolean
  disableVesting: boolean
}) => {
  const [selectedMultisig] = useSelectedMultisig()
  const orgs = useRecoilValue(userOrganisationsState)
  const org = orgs?.find(o => o.id === selectedMultisig.orgId)
  const [selectedToken, setSelectedToken] = useRecoilState<BaseToken | undefined>(multisendTokenAtom)

  useEffect(() => {
    if (
      props.tokens.state === 'hasValue' &&
      props.tokens.contents.length > 0 &&
      !props.tokens.contents.find(token => token.id === selectedToken?.id)
    )
      setSelectedToken(
        props.tokens.contents.find(token => token.id === token.chain.nativeToken.id) ?? props.tokens.contents[0]
      )
  }, [props.tokens, selectedToken, setSelectedToken])

  return (
    <div className="flex flex-col gap-[24px] pt-[32px] w-full">
      <Input
        label="Transaction Description"
        placeholder={`e.g. "Contract Payments June 2023"`}
        value={props.name}
        onChange={e => props.setName(e.target.value)}
      />
      <TokensSelect
        leadingLabel="Token"
        tokens={props.tokens.contents ?? []}
        selectedToken={selectedToken}
        onChange={token => setSelectedToken(token)}
      />
      <MultiSendTable
        chainGenesisHash={props.chain.genesisHash}
        disableVesting={props.disableVesting}
        hideVesting={CONFIG.USE_PAYWALL ? org === undefined || org.plan.id === 0 : false}
      />
      <div className="flex flex-col [&>div]:flex [&>div]:justify-between [&>div]:gap-[16px] [&>div>p]:text-[16px]">
        {props.totalSends > 0 && selectedToken && (
          <>
            <div>
              <p>Total Sends</p>
              <p>{props.totalSends}</p>
            </div>
            <div>
              <p>Total Amount</p>
              <AmountRow
                hideIcon
                balance={{
                  token: selectedToken,
                  amount: props.totalAmount,
                }}
              />
            </div>
          </>
        )}
        {props.hasNonDelayedPermission === false ? (
          <div css={{ '> div': { p: { fontSize: 14 } } }}>
            {props.hasDelayedPermission ? (
              <Alert>
                <p>Time delayed proxies are not supported yet.</p>
              </Alert>
            ) : (
              <Alert>
                <p>
                  Your Multisig does not have the proxy permission required to send token on behalf of the proxied
                  account.
                </p>
              </Alert>
            )}
          </div>
        ) : (
          <Button
            disabled={!props.hasNonDelayedPermission || !props.name || props.disabled}
            onClick={props.onNext}
            children="Review"
            className="w-max mt-[16px]"
            loading={props.hasNonDelayedPermission === undefined}
          />
        )}
      </div>
    </div>
  )
}

export default MultiSendForm
