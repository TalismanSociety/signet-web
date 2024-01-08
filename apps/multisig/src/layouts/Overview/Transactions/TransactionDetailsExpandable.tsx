import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/theme-twilight'
import 'ace-builds/src-noconflict/ext-language_tools'

import AddressPill from '@components/AddressPill'
import { CallDataPasteForm } from '@components/CallDataPasteForm'
import AmountRow from '@components/AmountRow'
import MemberRow from '@components/MemberRow'
import { Rpc, decodeCallData } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { Balance, Transaction, TransactionType, calcSumOutgoing, txOffchainMetadataState } from '@domains/multisig'
import { css } from '@emotion/css'
import { useTheme } from '@emotion/react'
import { Check, Contract, Copy, List, Send, Settings, Share2, Unknown, Users, Vote } from '@talismn/icons'
import { Address } from '@util/addresses'
import { useEffect, useMemo, useState } from 'react'
import AceEditor from 'react-ace'
import { useRecoilState, useRecoilValueLoadable } from 'recoil'
import truncateMiddle from 'truncate-middle'
import { VoteExpandedDetails, VoteTransactionHeaderContent } from './VoteTransactionDetails'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { SmartContractCallExpandedDetails } from '../../SmartContracts/SmartContractCallExpandedDetails'
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from '@components/ui/accordion'
import { AccountDetails } from '@components/AddressInput/AccountDetails'

const CopyPasteBox: React.FC<{ content: string; label: string }> = ({ content, label }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }, [copied])

  const handleCopy = () => {
    if (copied) return
    navigator.clipboard.writeText(content)
    setCopied(true)
  }
  return (
    <div className="flex flex-col gap-[16]">
      <p className="ml-[8px] mb-[8px]">{label}</p>
      <div className="p-[16px] gap-[16px] flex items-center w-full overflow-hidden justify-between bg-gray-800 rounded-[16px]">
        <p className="break-all text-[14px]" style={{ wordBreak: 'break-all' }}>
          {content}
        </p>
        {copied ? (
          <div className="text-green-500">
            <Check size={20} className="min-w-[20px]" />
          </div>
        ) : (
          <div className="hover:text-offWhite cursor-pointer" onClick={handleCopy}>
            <Copy size={20} className="min-w-[20px]" />
          </div>
        )}
      </div>
    </div>
  )
}

const ChangeConfigExpandedDetails = ({ t }: { t: Transaction }) => {
  const { contactByAddress } = useKnownAddresses(t.multisig.id)
  return (
    <div>
      <div css={{ display: 'grid', gap: 12, marginTop: '8px' }}>
        {!t.executedAt && (
          <>
            <p css={{ fontWeight: 'bold' }}>Current Signers</p>
            {t.multisig.signers.map(s => {
              const contact = contactByAddress[s.toSs58()]
              return (
                <MemberRow
                  key={s.toPubKey()}
                  member={{ address: s, nickname: contact?.name, you: contact?.extensionName !== undefined }}
                  chain={t.multisig.chain}
                />
              )
            })}
            <p>Threshold: {t.multisig.threshold}</p>
          </>
        )}
        <p css={{ fontWeight: 'bold', marginTop: '8px' }}>{!t.executedAt ? 'Proposed ' : ''}New Signers</p>
        {t.decoded?.changeConfigDetails?.signers.map(s => {
          const contact = contactByAddress[s.toSs58()]
          return (
            <MemberRow
              key={s.toPubKey()}
              member={{ address: s, nickname: contact?.name, you: contact?.extensionName !== undefined }}
              chain={t.multisig.chain}
            />
          )
        })}
        <p>Threshold: {t.decoded?.changeConfigDetails?.threshold}</p>
      </div>
    </div>
  )
}

const MultiSendExpandedDetails = ({ t }: { t: Transaction }) => {
  const theme = useTheme()
  const recipients = t.decoded?.recipients || []
  const { contactByAddress } = useKnownAddresses(t.multisig.id)

  return (
    <div css={{ paddingBottom: '8px' }}>
      {t.decoded?.recipients.map((r, i) => {
        const { address, balance } = r
        const last = i === recipients.length - 1
        return (
          <div
            key={`${address.toSs58(t.multisig.chain)}-${JSON.stringify(balance.amount)}`}
            css={{
              display: 'grid',
              gap: '16px',
              borderBottom: `${last ? '0px' : '1px'} solid rgb(${theme.backgroundLighter})`,
              padding: `${last ? '8px 0 0 0' : '8px 0'}`,
            }}
          >
            <div css={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                className={css`
                  display: flex;
                  align-items: center;
                  height: 25px;
                  border-radius: 100px;
                  background-color: var(--color-backgroundLighter);
                  padding: 8px 14px;
                  font-size: 14px;
                  gap: 4px;
                  margin-left: 8px;
                `}
              >
                <span css={{ marginTop: '3px' }}>
                  {i + 1} of {recipients.length}
                </span>
              </div>
              <AddressPill name={contactByAddress[address.toSs58()]?.name} address={address} chain={t.multisig.chain} />
              <div css={{ marginLeft: 'auto' }}>
                <AmountRow balance={balance} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AdvancedExpendedDetails({ callData, rpcs }: { callData: `0x${string}` | undefined; rpcs: Rpc[] }) {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(rpcs))
  const [error, setError] = useState<Error | undefined>(undefined)

  const { extrinsic, human, lines } = useMemo(() => {
    if (apiLoadable.state === 'hasValue' && callData) {
      const api = apiLoadable.contents
      try {
        const extrinsic = decodeCallData(api, callData)
        const human = JSON.stringify(extrinsic?.method.toHuman(), null, 2)
        const lines = human.split(/\r\n|\r|\n/).length
        return { extrinsic, human, lines }
      } catch (error) {
        if (error instanceof Error) {
          setError(error)
        } else {
          setError(new Error('Unknown error'))
        }
      }
    }
    return { extrinsic: undefined, human: '', lines: 0 }
  }, [callData, apiLoadable])

  if (!callData) return null

  return (
    <div css={{ paddingBottom: '8px' }}>
      <AceEditor
        mode="yaml"
        theme="twilight"
        value={
          extrinsic
            ? human
            : error
            ? `Failed to decode calldata, please open an issue at\nhttps://github.com/TalismanSociety/talisman-web\nwith the following details:\n\nError\n${error}\n\nCalldata\n${callData}`
            : 'Loading...'
        }
        readOnly={true}
        name="yaml"
        setOptions={{ useWorker: false }}
        style={{ width: '100%', border: '1px solid #232323' }}
        minLines={lines + 1}
        maxLines={lines + 1}
      />
    </div>
  )
}

const TransactionDetailsHeaderContent: React.FC<{ t: Transaction }> = ({ t }) => {
  const { contactByAddress } = useKnownAddresses(t.multisig.id, {
    includeSelectedMultisig: true,
    includeContracts: true,
  })
  const recipients = t.decoded?.recipients || []

  if (!t.decoded) return null

  if (t.decoded.type === TransactionType.Transfer)
    return (
      <div
        className={css`
          color: var(--color-foreground);
          margin-right: 16px;
          margin-left: auto;
        `}
      >
        <AddressPill
          name={contactByAddress[recipients[0]!.address.toSs58()]?.name}
          address={recipients[0]?.address as Address}
          chain={t.multisig.chain}
        />
      </div>
    )

  if (t.decoded.type === TransactionType.MultiSend)
    return (
      <div className="flex items-center justify-end gap-[4px] py-[2px] px-[8px] bg-gray-800 rounded-[12px]">
        <Users size={12} className="text-primary" />
        <p className="text-[14px] mt-[4px] text-offWhite">
          {recipients.length} Send{recipients.length > 1 && 's'}
        </p>
      </div>
    )

  if (t.decoded.type === TransactionType.Vote) return <VoteTransactionHeaderContent t={t} />

  if (t.decoded.type === TransactionType.ContractCall && t.decoded.contractCall)
    return (
      <AccountDetails
        address={t.decoded.contractCall.address}
        chain={t.multisig.chain}
        name={contactByAddress[t.decoded.contractCall.address.toSs58()]?.name}
        withAddressTooltip
      />
    )

  return null
}
const TransactionDetailsExpandable = ({ t }: { t: Transaction }) => {
  const [metadata, setMetadata] = useRecoilState(txOffchainMetadataState)
  const sumOutgoing: Balance[] = useMemo(() => calcSumOutgoing(t), [t])

  const { name, icon } = useMemo(() => {
    if (!t.decoded) return { name: 'Unknown Transaction', icon: <Unknown /> }

    switch (t.decoded.type) {
      case TransactionType.MultiSend:
        return { name: 'Multi-Send', icon: <Share2 /> }
      case TransactionType.Transfer:
        return { name: 'Send', icon: <Send /> }
      case TransactionType.Advanced:
        return { name: 'Advanced', icon: <List /> }
      case TransactionType.ChangeConfig:
        return { name: 'Change Signer Configuration', icon: <Settings /> }
      case TransactionType.Vote:
        return { name: 'Vote', icon: <Vote /> }
      case TransactionType.ContractCall:
        return { name: 'Contract call', icon: <Contract /> }
      default:
        return { name: 'Unknown Transaction', icon: <Unknown /> }
    }
  }, [t.decoded])

  return (
    <div className="px-[16px] bg-gray-600 rounded-[16px] max-w-[100%]">
      <Accordion
        type="single"
        collapsible
        className="max-w-[100%]"
        defaultValue={t.decoded?.type !== TransactionType.Transfer ? '1' : undefined}
      >
        <AccordionItem value="1" className="!border-b-0">
          <AccordionTrigger className="!py-[16px] w-full">
            <div className="flex items-center justify-between w-full pr-[8px]">
              <div className="flex gap-[8px] items-center">
                <p className="text-offWhite mt-[4px]">{name}</p>
                <div className="text-primary [&>svg]:h-[20px]">{icon}</div>
              </div>
              <div className="flex items-center gap-[8px]">
                <TransactionDetailsHeaderContent t={t} />
                {t.decoded && t.decoded.type !== TransactionType.Advanced && (
                  <div className="flex items-end flex-col">
                    {sumOutgoing.map(b => (
                      <AmountRow key={b.token.id} balance={b} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-[16px]">
              {t.decoded?.type === TransactionType.MultiSend ? (
                <MultiSendExpandedDetails t={t} />
              ) : t.decoded?.type === TransactionType.ChangeConfig ? (
                <ChangeConfigExpandedDetails t={t} />
              ) : t.decoded?.type === TransactionType.Advanced ? (
                <AdvancedExpendedDetails callData={t.callData} rpcs={t.multisig.chain.rpcs} />
              ) : t.decoded?.type === TransactionType.Vote ? (
                <VoteExpandedDetails t={t} />
              ) : t.decoded?.type === TransactionType.ContractCall ? (
                <SmartContractCallExpandedDetails t={t} />
              ) : !t.decoded ? (
                <div className="grid gap-[8px]">
                  <p className="text-[14px]">
                    Signet was unable to automatically determine the calldata for this transaction. Perhaps it was
                    created outside of Signet, or the Signet metadata sharing service is down.
                    <br />
                    <br />
                    Don't worry though, it's not a problem. Ask someone to share the calldata with you and paste it
                    below, or approve as-is <b>if and only if</b> you are sure you know what it is doing.
                  </p>
                  <CallDataPasteForm
                    extrinsic={undefined}
                    setExtrinsic={e => {
                      if (!e) return
                      const expectedHash = t.hash
                      const extrinsicHash = e.registry.hash(e.method.toU8a()).toHex()
                      if (expectedHash === extrinsicHash) {
                        setMetadata({
                          ...metadata,
                          [expectedHash]: [
                            {
                              callData: e.method.toHex(),
                              description: `Transaction ${truncateMiddle(expectedHash, 6, 4, '...')}`,
                            },
                            new Date(),
                          ],
                        })
                      }
                    }}
                  />
                  <p className="!text-[12px]">
                    Call Hash <code>{t.hash}</code>
                  </p>
                </div>
              ) : null}
              {(t.callData !== undefined || t.hash !== undefined) && (
                <div className="border-t border-gray-500 pt-[16px] max-w-[100%] overflow-hidden flex flex-col gap-[16px]">
                  {t.callData !== undefined && <CopyPasteBox label="Multisig call data" content={t.callData} />}
                  {t.hash !== undefined && <CopyPasteBox label="Call hash" content={t.hash} />}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default TransactionDetailsExpandable
