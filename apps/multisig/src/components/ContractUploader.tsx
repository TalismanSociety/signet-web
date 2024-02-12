import React, { useCallback, useState } from 'react'
import { Input } from './ui/input'
import { useToast } from './ui/use-toast'
import { getErrorString } from '@util/misc'
import { Abi } from '@polkadot/api-contract'
import { Button } from './ui/button'
import { File, X } from 'lucide-react'

type Props = {
  // provides a decoded contract
  onContractChange: (contractAbi?: Abi) => void
}

const Info: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div>
    <p className="text-offWhite text-[14px]">{title}</p>
    <p className="text-[12px] break-all">{value}</p>
  </div>
)

export const ContractUploader: React.FC<Props> = ({ onContractChange }) => {
  const [abi, setAbi] = useState<Abi>()
  const [fileName, setFileName] = useState('')
  const { dismiss, toast } = useToast()
  const [resetKey, setResetKey] = useState(0)

  const handleFile = useCallback(
    async (file: File) => {
      const content = await file.text()
      setFileName(file.name)
      try {
        // try to parse file content to ABI
        const _abi = new Abi(content)
        // validate wasm
        if (!_abi.info.source.wasm || _abi.info.source.wasm.isEmpty) throw new Error('Missing wasm code.')

        // validate code hash
        if (!_abi.info.source.wasm || _abi.info.source.wasmHash.isEmpty) throw new Error('Missing code hash.')

        setAbi(_abi)

        onContractChange(_abi)
      } catch (e) {
        toast({
          title: 'Invalid contract',
          description: getErrorString(e),
        })
        console.error('Invalid contract', e)
      }
    },
    [onContractChange, toast]
  )

  const handleClearFile = useCallback(() => {
    setFileName('')
    // trigger rerender on input to clear the file selection
    setResetKey(resetKey + 1)
    dismiss()
  }, [dismiss, resetKey])

  const handleReset = useCallback(() => {
    setFileName('')
    setAbi(undefined)
    onContractChange(undefined)
  }, [onContractChange])

  if (!abi)
    return (
      <div className="relative w-full">
        <Input
          label="Contract Bundle"
          type="file"
          accept=".contract"
          key={resetKey}
          onChange={e => {
            const contractFile = e.target.files?.item(0)
            if (contractFile) handleFile(contractFile)
          }}
        />
        {fileName.length > 0 && (
          <Button
            className="absolute right-[12px] bottom-[16px] h-[24px] w-[24px]"
            size="icon"
            variant="ghost"
            onClick={handleClearFile}
          >
            <X size={16} />
          </Button>
        )}
      </div>
    )

  return (
    <div className="w-full grid gap-[16px]">
      <div className="w-full">
        <label className="text-gray-200 text-[14px] mb-[8px]">Uploaded Contract Bundle</label>
        <div className="bg-gray-800 p-[12px] w-max flex items-center gap-[8px] rounded-[12px]">
          <File size={16} />
          <p className="text-offWhite text-[14px] mt-[4px] mr-[4px]">{fileName}</p>
          <Button size="icon" variant="ghost" className="h-[20px] w-[20px]" onClick={handleReset}>
            <X size={12} />
          </Button>
        </div>
      </div>
      <div>
        <label className="text-gray-200 text-[14px] mb-[8px]">Metadata</label>
        <div className="bg-gray-800 p-[12px] w-full grid rounded-[12px] gap-[12px]">
          <Info title="Contract Hash" value={abi.info.source.wasmHash.toHex()} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            <Info title="Language" value={abi.info.source.language.toString()} />
            <Info title="Compiler" value={abi.info.source.compiler.toString()} />
            <Info title="Contract Version" value={abi.info.contract.version.toString()} />
            <Info title="Authors" value={abi.info.contract.authors.toLocaleString()} />
          </div>
        </div>
      </div>
    </div>
  )
}
