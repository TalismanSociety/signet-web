import { gql } from 'graphql-tag'
import { selector, useRecoilValue, useSetRecoilState } from 'recoil'
import { selectedAccountState, useUser } from '../auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Address, toMultisigAddress } from '@util/addresses'
import { Chain, supportedChains } from '../chains'
import { DUMMY_MULTISIG_ID, Multisig, selectedMultisigIdState, useSelectedMultisig } from '../multisig'
import { useToast } from '@components/ui/use-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Organisation,
  RawTeam,
  organisationsState,
  parsedOrganisationsState,
  userOrganisationsState,
} from './organisation'
import { useMutation } from '@apollo/client'

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
    public orgId: string,
    collaborators: Collaborator[] = []
  ) {
    this.collaborators = collaborators
  }

  toMultisig(): Multisig {
    return {
      id: this.id,
      orgId: this.orgId,
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
export const teamsState = selector<Team[]>({
  key: 'teams',
  get: ({ get }) => {
    const orgs = get(parsedOrganisationsState)
    if (!orgs) return []
    return orgs.map(org => org.teams).flat()
  },
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
    if (!selectedAccount) return undefined

    const orgs = get(userOrganisationsState)
    if (!orgs) return undefined

    const teams = orgs.map(org => org.teams).flat()
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

export const parseTeam = (org: Organisation, rawTeam: RawTeam): { team?: Team; error?: string } => {
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
    for (const rawUser of org.users ?? []) {
      if (rawUser.role !== 'collaborator') continue
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
        org.id,
        collaborators
      ),
    }
  } catch (e) {
    console.error(e)
    return { error: 'Failed to parse team.' }
  }
}

export const useUpdateMultisigConfig = () => {
  const { toast } = useToast()
  const setOrganisations = useSetRecoilState(organisationsState)
  const [mutate] = useMutation(gql`
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
  `)

  const updateMultisigConfig = useCallback(
    async (newMultisig: Multisig) => {
      try {
        const { data, errors } = await mutate({
          variables: {
            teamId: newMultisig.id,
            changeConfigDetails: {
              signers: newMultisig.signers.map(signer => signer.toSs58()),
              threshold: newMultisig.threshold,
            },
          },
        })

        if (errors || !data?.updateMultisigConfig?.success) {
          console.error(data, errors)
          throw new Error(errors?.[0]?.message ?? 'Failed to update multisig config')
        }

        setOrganisations(prev => {
          if (!prev) return prev
          const newOrgs = [...prev]
          const orgIndex = newOrgs.findIndex(org => org.id === newMultisig.orgId)
          if (orgIndex < 0) return prev
          const changedOrg = newOrgs[orgIndex]
          if (!changedOrg) return prev
          const newTeams = changedOrg.teams.map(team =>
            team.id === newMultisig.id
              ? {
                  ...team,
                  multisig_config: {
                    threshold: newMultisig.threshold,
                    signers: newMultisig.signers.map(signer => signer.toSs58()),
                  },
                }
              : team
          )
          newOrgs[orgIndex] = { ...changedOrg, teams: newTeams }
          return newOrgs
        })
      } catch (e) {
        console.error(e)
        toast({
          title: 'Failed to update multisig config',
        })
      }
    },
    [mutate, setOrganisations, toast]
  )

  return { updateMultisigConfig }
}

export const useTeamFromUrl = () => {
  const { user } = useUser()
  const [selectedMultisig, setSelectedMultisig] = useSelectedMultisig()
  const location = useLocation()
  const teams = useRecoilValue(teamsState)
  const [init, setInit] = useState(false)
  const navigate = useNavigate()

  const urlTeamId = useMemo(() => {
    const urlParams = new URLSearchParams(location.search)
    return urlParams.get('teamId')
  }, [location.search])

  useEffect(() => {
    if (!teams || init || !user) return

    // dont need to do anything
    if (!urlTeamId || urlTeamId === selectedMultisig.id) return setInit(true)

    // find the team to switch to
    const team = teams.find(team => team.id === urlTeamId)
    if (!team) return // team not found for the current signed in user

    setInit(true)

    // switch to team specified in url
    setSelectedMultisig(team.toMultisig())
  }, [init, selectedMultisig.id, setSelectedMultisig, teams, urlTeamId, user])

  useEffect(() => {
    // sign page has it's own vault switch mechanism so this shouldnt interupt it
    if (!init || (selectedMultisig.id === DUMMY_MULTISIG_ID && !location.pathname.includes('sign'))) return
    const curSearch = new URLSearchParams(location.search)
    if (curSearch.get('teamId') === selectedMultisig.id) return

    curSearch.set('teamId', selectedMultisig.id)
    navigate(`${window.location.pathname}?${curSearch.toString()}`, { replace: true })
  }, [init, location.pathname, location.search, navigate, selectedMultisig])
}
