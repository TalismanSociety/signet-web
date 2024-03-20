import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/theme-twilight'
import 'ace-builds/src-noconflict/ext-language_tools'

import { CallDataPasteForm } from '@components/CallDataPasteForm'
import AmountRow from '@components/AmountRow'
import MemberRow from '@components/MemberRow'
import { decodeCallData } from '@domains/chains'
import { pjsApiSelector, useApi } from '@domains/chains/pjs-api'
import { Balance, Transaction, TransactionType, calcSumOutgoing, tempCalldataState } from '@domains/multisig'
import { Check, Contract, Copy, List, Send, Settings, Share2, Unknown, Users, Vote, Zap } from '@talismn/icons'
import { Address } from '@util/addresses'
import { useEffect, useMemo, useRef, useState } from 'react'
import AceEditor from 'react-ace'
import { useRecoilValueLoadable, useSetRecoilState } from 'recoil'
import { VoteExpandedDetails, VoteTransactionHeaderContent } from './VoteTransactionDetails'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { SmartContractCallExpandedDetails } from '../../SmartContracts/SmartContractCallExpandedDetails'
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from '@components/ui/accordion'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import {
  ValidatorsRotationExpandedDetails,
  ValidatorsRotationHeader,
} from '../../../layouts/Staking/ValidatorsRotationSummaryDetails'
import { useDecodedCalldata } from '@domains/common'
import { Upload } from 'lucide-react'
import { DeployContractExpandedDetails } from '../../../layouts/SmartContracts/DeployContractExpandedDetails'
import { cn } from '@util/tailwindcss'
import { isExtrinsicProxyWrapped } from '@util/extrinsics'
import { CONFIG } from '@lib/config'

const CopyPasteBox: React.FC<{ content: string; label?: string }> = ({ content, label }) => {
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [exceeded, setExceeded] = useState(false)
  const [expanded, setExpanded] = useState(false)

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

  useEffect(() => {
    if (!contentRef.current) return
    setExceeded(contentRef.current.scrollHeight > contentRef.current.clientHeight)
  }, [])

  return (
    <div className="flex flex-col gap-[16]">
      {!!label && <p className="ml-[8px] mb-[8px]">{label}</p>}
      <div className="p-[16px] gap-[16px] flex items-center w-full overflow-hidden justify-between bg-gray-800 rounded-[16px]">
        <div className="w-full">
          <p
            ref={contentRef}
            className={cn('break-all text-[14px] leading-[20px]', expanded ? '' : 'overflow-hidden line-clamp-5')}
          >
            {content}
          </p>
          {exceeded && (
            <p
              className="text-center text-[14px] mx-auto mt-[4px] hover:text-offWhite cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Minimize' : 'Show all'}
            </p>
          )}
        </div>
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

const MultisigCallDataBox: React.FC<{ calldata: `0x${string}`; genesisHash: string }> = ({ calldata, genesisHash }) => {
  const { decodedCalldata } = useDecodedCalldata(calldata, genesisHash)
  const [viewJson, setViewJson] = useState(false)

  return (
    <div className="flex flex-col gap-[16]">
      <div className="px-[8px] mb-[4px] w-full flex items-center justify-between">
        <p>Multisig call data</p>
        <p className="text-[14px] cursor-pointer hover:text-offWhite" onClick={() => setViewJson(!viewJson)}>
          View as {viewJson ? 'Hex' : 'JSON'}
        </p>
      </div>
      {viewJson ? (
        <div className="bg-gray-800 rounded-[16px] p-[16px] w-full overflow-auto max-h-[50vh]">
          <pre className="text-[12px] leading-[1.2]">{JSON.stringify(decodedCalldata, null, 2)}</pre>
        </div>
      ) : (
        <CopyPasteBox content={calldata} />
      )}
    </div>
  )
}

const ChangeConfigExpandedDetails = ({ t }: { t: Transaction }) => {
  const { contactByAddress } = useKnownAddresses(t.multisig.orgId)
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
  const recipients = t.decoded?.recipients || []
  const { contactByAddress } = useKnownAddresses(t.multisig.orgId)

  return (
    <div>
      {t.decoded?.recipients.map(({ address, balance }, i) => (
        <div
          key={`${address.toSs58(t.multisig.chain)}-${JSON.stringify(balance.amount)}`}
          className="grid gap-[16px] border-b border-gray-500 py-[8px] last:border-b-0 last:pb-0"
        >
          <div className="flex items-center gap-[8px]">
            <div className="flex items-center justify-center h-[24px] rounded-full bg-gray-500 p-[8px]">
              <span className="mt-[3px] text-[14px]">
                {i + 1}/{recipients.length}
              </span>
            </div>
            <div className="[&>div>div]:gap-0 ">
              <AccountDetails
                name={contactByAddress[address.toSs58()]?.name}
                address={address}
                chain={t.multisig.chain}
                breakLine
                withAddressTooltip
                identiconSize={20}
                disableCopy
              />
            </div>
            <div className="ml-auto">
              <AmountRow balance={balance} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AdvancedExpendedDetails({
  callData,
  genesisHash,
}: {
  callData: `0x${string}` | undefined
  genesisHash: string
}) {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(genesisHash))
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
  const { contactByAddress } = useKnownAddresses(t.multisig.orgId, {
    includeContracts: true,
  })
  const recipients = t.decoded?.recipients || []

  if (!t.decoded) return null

  if (t.decoded.type === TransactionType.Transfer)
    return (
      <div className="bg-gray-500 ml-auto [&>div>p]:text-[14px] [&>div>p]:mt-0 p-[4px] px-[8px] [&>div]:gap-[4px] rounded-full max-w-[180px]">
        <AccountDetails
          address={recipients[0]?.address as Address}
          name={contactByAddress[recipients[0]!.address.toSs58()]?.name}
          chain={t.multisig.chain}
          withAddressTooltip
          nameOrAddressOnly
          identiconSize={16}
          disableCopy
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

  if (t.decoded.type === TransactionType.NominateFromNomPool || t.decoded.type === TransactionType.NominateFromStaking)
    return <ValidatorsRotationHeader t={t} />

  return null
}

const TransactionDetailsExpandable = ({ t }: { t: Transaction }) => {
  const sumOutgoing: Balance[] = useMemo(() => calcSumOutgoing(t), [t])
  const setTempCalldata = useSetRecoilState(tempCalldataState)
  const [decodeError, setDecodeError] = useState<string>()
  const { api } = useApi(t.multisig.chain.genesisHash)

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
      case TransactionType.DeployContract:
        return { name: 'Deploy Contract', icon: <Upload /> }
      case TransactionType.NominateFromNomPool:
        return { name: 'Staking (Nom Pool)', icon: <Zap /> }
      case TransactionType.NominateFromStaking:
        return { name: `Staking`, icon: <Zap /> }
      default:
        return { name: 'Unknown Transaction', icon: <Unknown /> }
    }
  }, [t.decoded])

  const transactionDetails = useMemo(() => {
    switch (t.decoded?.type) {
      case TransactionType.MultiSend:
        return <MultiSendExpandedDetails t={t} />
      case TransactionType.ChangeConfig:
        return <ChangeConfigExpandedDetails t={t} />
      case TransactionType.Advanced:
        return <AdvancedExpendedDetails callData={t.callData} genesisHash={t.multisig.chain.genesisHash} />
      case TransactionType.Vote:
        return <VoteExpandedDetails t={t} />
      case TransactionType.ContractCall:
        return <SmartContractCallExpandedDetails t={t} />
      case TransactionType.DeployContract:
        return <DeployContractExpandedDetails t={t} />
      case TransactionType.NominateFromNomPool:
      case TransactionType.NominateFromStaking:
        return <ValidatorsRotationExpandedDetails t={t} />
      default:
        return t.decoded ? null : (
          <div className="grid gap-[8px]">
            <p className="text-[14px]">
              {CONFIG.APP_NAME} was unable to automatically determine the calldata for this transaction. Perhaps it was
              created outside of {CONFIG.APP_NAME}.
              <br />
              <br />
              Don't worry though, it's not a problem. Ask someone to share the calldata with you and paste it below, or
              approve as-is <b>if and only if</b> you are sure you know what it is doing.
            </p>
            <CallDataPasteForm
              extrinsic={undefined}
              setExtrinsic={e => {
                if (!e || !t.id || !api) return setDecodeError("Couldn't decode calldata, please try again.")

                // use whatever the user paste if it matches the hash
                if (api.registry.hash(e.method.toU8a()).toHex() === t.hash) {
                  setDecodeError(undefined)
                  return setTempCalldata(prev => ({ ...prev, [t.id as string]: e.method.toHex() }))
                } else {
                  // if not match, check whether tx is wrapped in proxy call
                  const { isWrapped } = isExtrinsicProxyWrapped(e, t.multisig.proxyAddress)
                  if (!isWrapped) {
                    // calldata should be wrapped in proxy call, since it's not, we wrap it and match the hash again
                    const wrapped = api.tx.proxy.proxy(t.multisig.proxyAddress.bytes, null, e)
                    // calldata ok after we help wrap it
                    if (api.registry.hash(wrapped.method.toU8a()).toHex() === t.hash) {
                      setDecodeError(undefined)
                      return setTempCalldata(prev => ({ ...prev, [t.id as string]: wrapped.method.toHex() }))
                    }
                  }
                  setDecodeError("Calldata doesn't match transaction hash.")
                }
              }}
              onError={error => {
                if (error.includes('Cannot decode value')) {
                  setDecodeError('Not a valid calldata')
                } else {
                  setDecodeError(error)
                }
              }}
            />
            <p className="!text-[12px]">
              Call Hash <code>{t.hash}</code>
            </p>
            {!!decodeError && <p className="mt-[8px] text-red-500">{decodeError}</p>}
          </div>
        )
    }
  }, [api, decodeError, setTempCalldata, t])

  return (
    <div className="px-[16px] bg-gray-600 rounded-[16px] max-w-[100%]">
      <Accordion
        type="single"
        collapsible
        className="max-w-[100%]"
        defaultValue={transactionDetails === null && t.decoded?.type !== TransactionType.Transfer ? undefined : '1'}
      >
        <AccordionItem value="1" className="!border-b-0">
          <AccordionTrigger className="!py-[16px] w-full">
            <div className="flex items-center justify-between w-full pr-[8px]">
              <div className="flex gap-[8px] items-center">
                <p className="text-offWhite mt-[4px]">{name}</p>
                <div className="text-signet-primary [&>svg]:h-[20px]">{icon}</div>
              </div>
              <div className="flex items-center gap-[8px]">
                <TransactionDetailsHeaderContent t={t} />
                {t.decoded && t.decoded.type !== TransactionType.Advanced && sumOutgoing.length > 0 && (
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
              {transactionDetails}
              {(t.callData !== undefined || t.hash !== undefined) && (
                <div className="border-t border-gray-500 pt-[16px] max-w-[100%] overflow-hidden flex flex-col gap-[16px]">
                  {t.callData !== undefined && (
                    <MultisigCallDataBox calldata={t.callData} genesisHash={t.multisig.chain.genesisHash} />
                  )}
                  {/* {t.callData !== undefined && <CopyPasteBox label="Multisig call data" content={t.callData} />} */}
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
