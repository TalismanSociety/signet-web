import { Chain } from '@domains/chains'
import { useReferenda } from '@domains/referenda'
import { Select } from '@talismn/ui'
import { css } from '@emotion/css'
import useGetReferendums from '@hooks/queries/useGetReferendums'
import { SupportedChainIds } from '@domains/chains/generated-chains'
import clsx from 'clsx'

type Props = {
  chain: Chain
  referendumId?: number
  onChange: (referendumId: number) => void
}

export const ProposalsDropdown: React.FC<Props> = ({ chain, referendumId, onChange }) => {
  const { referendums } = useReferenda(chain)
  const ongoingReferendums = referendums?.filter(referendum => referendum.isOngoing)

  const { data: referendumsData, isLoading: isReferendumsDataLoading } = useGetReferendums({
    chainId: chain.squidIds.chainData as SupportedChainIds,
    ids: ongoingReferendums?.map(referendum => String(referendum.index)) ?? [],
  })

  return (
    <Select
      className={clsx(
        'truncate',
        css`
          button {
            height: 56px;
          }
        `
      )}
      placeholder="Select proposal to vote on"
      value={referendumId}
      onChange={onChange}
    >
      {ongoingReferendums?.map(referendum => {
        const referendumData = referendumsData?.find(ref => ref?.referendumIndex === referendum.index)
        return (
          <Select.Option
            headlineText={referendumData?.title || `Proposal #${referendum.index}`}
            value={referendum.index}
            key={referendum.index}
          />
        )
      })}
    </Select>
  )
}
