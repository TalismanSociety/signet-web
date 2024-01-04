export type SubstrateContractFromPallet = {
  codeHash: string
  depositAccount: string
  trieId: string
}

export type ParsedContractBundle = {
  source: {
    hash: string
  }
  contract: {
    name: string
  }
  spec: {
    messages: any[]
    constructors: any[]
  }
  raw: string
}
