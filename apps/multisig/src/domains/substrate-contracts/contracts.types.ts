export type SubstrateContractFromPallet = {
  codeHash: string
  depositAccount: string
  trieId: string
}

export type ContractMessage = {
  args: {
    label: string
    type: {
      displayName: string[]
      type: number
    }
  }[]
  default: boolean
  docs: string[]
  label: string
  mutates: true
  payable: false
  returnType: {
    displayName: [string, string]
    type: number
  }
  selector: `0x${string}`
}

export type ParsedContractBundle = {
  source: {
    hash: string
  }
  contract: {
    name: string
  }
  spec: {
    messages: ContractMessage[]
    constructors: ContractMessage[]
  }
  raw: string
}
