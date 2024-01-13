import { gql } from 'graphql-request'
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { SignedInAccount, selectedAccountState } from '../auth'
import { useCallback, useEffect, useState } from 'react'
import { requestSignetBackend } from './hasura'
import { Address, toMultisigAddress } from '@util/addresses'
import { Chain, supportedChains } from '../chains'
import { Multisig, selectedMultisigIdState, useSelectedMultisig } from '../multisig'
import { useToast } from '@components/ui/use-toast'
import { getErrorString } from '@util/misc'
import { captureException } from '@sentry/react'

type RawTeam = {
  id: string
  name: string
  multisig_config: any
  proxied_address: string
  chain: string
  collaborators: {
    user: {
      id: string
      identifier: string
    }
  }[]
}

type Collaborator = {
  id: string
  address: Address
}

export class Team {
  collaborators: Collaborator[] = []
  constructor(
    public id: string,
    public name: string,
    public multisigConfig: {
      threshold: number
      signers: Address[]
    },
    public chain: Chain,
    public proxiedAddress: Address,
    public delegateeAddress: Address,
    collaborators: Collaborator[] = []
  ) {
    this.collaborators = collaborators
  }

  toMultisig(): Multisig {
    return {
      id: this.id,
      name: this.name,
      multisigAddress: toMultisigAddress(this.multisigConfig.signers, this.multisigConfig.threshold),
      proxyAddress: this.proxiedAddress,
      signers: this.multisigConfig.signers,
      threshold: this.multisigConfig.threshold,
      chain: this.chain,
      collaborators: this.collaborators,
    }
  }

  /** @deprecated this is only for backward compatibility, we're switching to use Team only */
  get asMultisig(): Multisig {
    return this.toMultisig()
  }

  isSigner(address: Address): boolean {
    return this.multisigConfig.signers.some(signer => signer.isEqual(address))
  }

  isCollaborator(id: string): boolean {
    return this.collaborators.some(collaborator => collaborator.id === id)
  }

  isEqual(team: Team): boolean {
    return (
      this.id === team.id &&
      this.name === team.name &&
      this.proxiedAddress.isEqual(team.proxiedAddress) &&
      this.chain.chainName === team.chain.chainName &&
      this.multisigConfig.threshold === team.multisigConfig.threshold &&
      this.multisigConfig.signers.length === team.multisigConfig.signers.length &&
      this.multisigConfig.signers.every(signer => team.multisigConfig.signers.some(s => s.isEqual(signer))) &&
      this.collaborators.length === team.collaborators.length &&
      this.collaborators.every(collaborator => team.collaborators.some(c => c.id === collaborator.id))
    )
  }
}

/** a list of all teams known to all signed in users */
export const teamsState = atom<Team[] | undefined>({
  key: 'teams',
  default: undefined,
  dangerouslyAllowMutability: true,
})

export const selectedTeamState = selector({
  key: 'selectedTeam',
  get: ({ get }) => {
    const selectedMultisigId = get(selectedMultisigIdState)
    const teams = get(teamsState)
    return teams?.find(team => team.id === selectedMultisigId)
  },
})

export const activeTeamsState = selector({
  key: 'activeTeams',
  get: ({ get }) => {
    const selectedAccount = get(selectedAccountState)
    const teams = get(teamsState)

    if (!selectedAccount) return []

    if (!teams) return undefined

    // find all teams where the user is a collaborator or a signer
    return teams
      .map(team => ({
        ...team,
        asMultisig: team.toMultisig(),
        isSigner: team.isSigner(selectedAccount.injected.address),
        isCollaborator: team.isCollaborator(selectedAccount.id),
      }))
      .filter(team => team.isSigner || team.isCollaborator)
  },
})

const TEAM_BY_SIGNER_QUERY = gql`
  query TeamBySigner {
    team {
      id
      name
      chain
      multisig_config
      proxied_address
      collaborators: users(where: { role: { _eq: "collaborator" } }) {
        user_id
        user {
          id
          identifier
          identifier
        }
      }
    }
  }
`

const parseTeam = (rawTeam: RawTeam): { team?: Team; error?: string } => {
  try {
    // make sure chain is supported chain
    const chain = supportedChains.find(chain => chain.squidIds.chainData === rawTeam.chain)
    if (!chain) {
      return { error: `Invalid chain: ${rawTeam.chain} not supported in ${rawTeam.id}` }
    }

    // make sure proxied address is valid address
    const proxiedAddress = Address.fromSs58(rawTeam.proxied_address)
    if (!proxiedAddress) {
      return { error: `Invalid proxied address: ${rawTeam.proxied_address} in ${rawTeam.id}` }
    }

    const rawSigners = rawTeam.multisig_config.signers
    const rawThreshold = rawTeam.multisig_config.threshold

    const signers: Address[] = []
    let delegateeAddress: Address | undefined
    let threshold = 0

    // find the delegatee address (i.e. multisig)
    if (rawSigners && rawSigners.length > 0 && rawThreshold) {
      // validate all signers from multisig config
      for (const signer of rawTeam.multisig_config.signers) {
        const signerAddress = Address.fromSs58(signer)
        if (!signerAddress) {
          return { error: `Invalid  Multisig Config: ${signer} in ${rawTeam.id}` }
        }
        signers.push(signerAddress)
      }
      // validate threshold value
      if (typeof rawThreshold !== 'number' || rawThreshold > signers.length) {
        return { error: `Invalid Multisig Config: Invalid threshold in ${rawTeam.id}` }
      }
      threshold = rawTeam.multisig_config.threshold

      // derive delegatee address from multisig config
      delegateeAddress = toMultisigAddress(signers, threshold)
    }

    // not a valid vault if no delegateeAddress, a signet vault consists of 1 multisig that is proxy to another acc
    if (!delegateeAddress) return { error: `Missing multisig config / delegatee address in ${rawTeam.id}` }

    const collaborators: Collaborator[] = []

    // parse collaborators
    for (const rawUser of rawTeam.collaborators) {
      const rawAddress = rawUser.user.identifier
      const address = Address.fromSs58(rawAddress)
      if (!address) {
        console.error(`Invalid user address: ${rawAddress} in ${rawTeam.id}`)
        continue
      }
      collaborators.push({ id: rawUser.user.id, address })
    }

    return {
      team: new Team(
        rawTeam.id,
        rawTeam.name,
        {
          threshold: rawTeam.multisig_config.threshold,
          signers,
        },
        chain,
        proxiedAddress,
        delegateeAddress,
        collaborators
      ),
    }
  } catch (e) {
    console.error(e)
    return { error: 'Failed to parse team.' }
  }
}

export const TeamsWatcher: React.FC = () => {
  const [teams, setTeams] = useRecoilState(teamsState)
  const selectedAccount = useRecoilValue(selectedAccountState)
  const { toast } = useToast()

  const fetchTeams = useCallback(
    async (account: SignedInAccount) => {
      const { data, error } = await requestSignetBackend<{ team: RawTeam[] }>(TEAM_BY_SIGNER_QUERY, {}, account)

      if (data?.team) {
        let changed = false
        const validTeams: Team[] = [...(teams ?? [])]
        // parse and validate each team from raw json to Team
        for (const rawTeam of data.team) {
          const { team, error } = parseTeam(rawTeam)
          if (!team || error) {
            console.error(error ?? 'Failed to parse team')
            continue
          }

          const exist = validTeams.findIndex(t => t.id === team.id)
          if (exist >= 0) {
            const oldTeam = validTeams[exist]
            if (oldTeam?.isEqual(team)) continue
            validTeams.splice(exist, 1)
          }
          changed = true
          validTeams.push(team)
        }
        if (changed) setTeams(validTeams)
      } else {
        toast({
          title: 'Failed to get vaults',
          description: error?.message || 'Please try again later.',
        })
      }
    },
    [setTeams, teams, toast]
  )

  useEffect(() => {
    if (!selectedAccount) return
    // fetch teams for selected account for the first time
    fetchTeams(selectedAccount)

    // refresh every 15secs to update vaults in "real-time"
    const interval = setInterval(() => {
      fetchTeams(selectedAccount)
    }, 15_000)

    return () => clearInterval(interval)
  }, [fetchTeams, selectedAccount])

  return null
}

export const useCreateTeamOnHasura = () => {
  const signer = useRecoilValue(selectedAccountState)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const setTeams = useSetRecoilState(teamsState)
  const setSelectedMultisigId = useSetRecoilState(selectedMultisigIdState)

  const createTeam = useCallback(
    async (teamInput: {
      name: string
      chain: string
      multisigConfig: { signers: string[]; threshold: number }
      proxiedAddress: string
    }): Promise<{ team?: Team; error?: string }> => {
      if (creatingTeam) return {}

      if (!signer) return { error: 'Not signed in yet.' }

      try {
        const res = await requestSignetBackend(
          gql`
            mutation CreateMultisigProxyTeam($team: InsertMultisigProxyInput!) {
              insertMultisigProxy(team: $team) {
                success
                team {
                  id
                  name
                  multisig_config
                  proxied_address
                  chain
                }
                error
              }
            }
          `,
          {
            team: {
              name: teamInput.name,
              chain: teamInput.chain,
              multisig_config: teamInput.multisigConfig,
              proxied_address: teamInput.proxiedAddress,
            },
          },
          signer
        )

        if (res.data?.insertMultisigProxy?.error) return { error: res.data?.insertMultisigProxy?.error }
        const createdTeam = res.data?.insertMultisigProxy?.team
        const { team, error } = parseTeam(createdTeam)
        if (!team || error) return { error: error ?? 'Failed to store team data.' }

        setTeams(teams => {
          const newTeams = [...(teams ?? [])]
          const exist = newTeams.findIndex(t => t.id === team.id)
          if (exist >= 0) newTeams.splice(exist, 1)
          newTeams.push(team)
          return newTeams
        })
        setSelectedMultisigId(team.id)
        return { team }
      } catch (e: any) {
        console.error(e)
        return { error: typeof e === 'string' ? e : e.message ?? 'Unknown error' }
      } finally {
        setCreatingTeam(false)
      }
    },
    [creatingTeam, setSelectedMultisigId, setTeams, signer]
  )

  return { createTeam, creatingTeam }
}

export const changingMultisigConfigState = atom<boolean>({
  key: 'changingMultisigConfig',
  default: false,
})

export const useUpdateMultisigConfig = () => {
  const setTeams = useSetRecoilState(teamsState)
  const { toast } = useToast()

  const updateMultisigConfig = useCallback(
    async (newMultisig: Multisig, signedInAs: SignedInAccount | null) => {
      if (signedInAs) {
        try {
          const res = await requestSignetBackend(
            gql`
              mutation UpdateMultisigConfig($teamId: String!, $changeConfigDetails: ChangeConfigDetailsInput!) {
                updateMultisigConfig(teamId: $teamId, changeConfigDetails: $changeConfigDetails) {
                  success
                  team {
                    id
                    name
                    multisig_config
                    proxied_address
                    chain
                  }
                  error
                }
              }
            `,
            {
              teamId: newMultisig.id,
              changeConfigDetails: {
                signers: newMultisig.signers.map(signer => signer.toSs58()),
                threshold: newMultisig.threshold,
              },
            },
            signedInAs
          )

          if (res.error) throw new Error(res.error)
        } catch (e) {
          console.error(e)
          toast({
            title: 'Failed to save multisig config change.',
          })
        }
      }

      const newTeam = parseTeam({
        chain: newMultisig.chain.squidIds.chainData,
        collaborators: newMultisig.collaborators.map(collaborator => ({
          user: {
            id: collaborator.id,
            identifier: collaborator.address.toSs58(),
          },
        })),
        id: newMultisig.id,
        multisig_config: {},
        name: newMultisig.name,
        proxied_address: newMultisig.proxyAddress.toSs58(),
      })

      setTeams(teams => {
        if (!teams || !newTeam.team) return teams
        const newTeams = [...teams]
        const teamIndex = newTeams.findIndex(team => team.id === newMultisig.id)
        if (teamIndex >= 0) newTeams[teamIndex] = newTeam.team

        return newTeams
      })
    },
    [setTeams, toast]
  )

  return { updateMultisigConfig }
}

export const useAddCollaborator = () => {
  const [adding, setAdding] = useState(false)
  const signedInAs = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const setTeams = useSetRecoilState(teamsState)
  const { toast } = useToast()

  const addCollaborator = useCallback(
    async (address: Address) => {
      // this shouldnt happen
      if (!signedInAs) {
        toast({
          title: 'Failed to add collaborator',
          description: 'Unauthorized',
        })
        return false
      }
      try {
        setAdding(true)
        const res = await requestSignetBackend(
          gql`
            mutation AddNewCollaborator($collaborator: AddCollaboratorInput!) {
              addCollaborator(collaborator: $collaborator) {
                success
                userId
                error
              }
            }
          `,
          {
            collaborator: {
              address: address.toSs58(),
              team_id: selectedMultisig.id,
            },
          },
          signedInAs
        )

        if (res.data?.addCollaborator?.error) {
          toast({
            title: 'Failed to add collaborator',
            description: res.data?.addCollaborator?.error,
          })
          return false
        }

        if (res.error) throw new Error(res.error)

        toast({
          title: 'Added collaborator',
          description: `Added ${address.toShortSs58(selectedMultisig.chain)} as collaborator`,
        })

        // update in memory cache for instant UI feedback
        setTeams(teams => {
          const newTeams = [...(teams ?? [])]
          if (!newTeams) return newTeams

          const teamIndex = newTeams.findIndex(team => team.id === selectedMultisig.id)
          if (teamIndex >= 0) {
            const newTeam = newTeams[teamIndex]
            if (!newTeam) return newTeams // this shouldnt happen, only for type safety

            newTeam.collaborators = [...newTeam.collaborators, { id: res.data?.addCollaborator?.userId, address }]
            newTeams[teamIndex] = newTeam
          }

          return newTeams
        })
        return true
      } catch (e) {
        captureException(e)
        toast({
          title: 'Failed to add collaborator',
          description: getErrorString(e),
        })
        return false
      } finally {
        setAdding(false)
      }
    },
    [selectedMultisig.chain, selectedMultisig.id, setTeams, signedInAs, toast]
  )

  return { addCollaborator, adding, selectedMultisig }
}

export const useDeleteCollaborator = () => {
  const signedInAs = useRecoilValue(selectedAccountState)
  const [deleting, setDeleting] = useState(false)
  const [teams, setTeams] = useRecoilState(teamsState)
  const { toast } = useToast()

  const deleteCollaborator = useCallback(
    async (teamId: string, userId: string) => {
      // this shouldnt happen
      if (!signedInAs) {
        toast({
          title: 'Failed to add collaborator',
          description: 'Unauthorized',
        })
        return false
      }

      if (!teams) return false
      const team = teams.find(team => team.id === teamId)
      if (!team) return false

      const user = team.collaborators.find(collaborator => collaborator.id === userId)
      if (!user) return false

      try {
        setDeleting(true)
        const res = await requestSignetBackend(
          gql`
            mutation DeleteCollaborator($teamId: uuid!, $userId: uuid!) {
              delete_team_user_role_by_pk(team_id: $teamId, user_id: $userId) {
                team_id
                user_id
              }
            }
          `,
          {
            teamId,
            userId,
          },
          signedInAs
        )

        if (res.error) throw new Error(res.error)

        if (res.data?.delete_team_user_role_by_pk?.team_id !== teamId) {
          throw new Error('Failed to delete collaborator')
        }

        toast({
          title: 'Deleted collaborator',
          description: `Removed ${user.address.toShortSs58(team.chain)} as collaborator`,
        })

        // update in memory cache for instant UI feedback
        setTeams(teams => {
          const newTeams = [...(teams ?? [])]
          if (!newTeams) return newTeams

          const teamIndex = newTeams.findIndex(team => team.id === teamId)
          if (teamIndex >= 0) {
            const newTeam = newTeams[teamIndex]
            if (!newTeam) return newTeams // this shouldnt happen, only for type safety

            newTeam.collaborators = newTeam.collaborators.filter(collaborator => collaborator.id !== userId)
            newTeams[teamIndex] = newTeam
          }

          return newTeams
        })
      } catch (e) {
        captureException(e, { extra: { teamId, userId } })
        toast({
          title: 'Failed to delete collaborator',
          description: getErrorString(e),
        })
        return false
      } finally {
        setDeleting(false)
      }
    },
    [setTeams, signedInAs, teams, toast]
  )

  return { deleting, deleteCollaborator }
}
