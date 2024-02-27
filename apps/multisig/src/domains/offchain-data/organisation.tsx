import { useMutation, useQuery } from '@apollo/client'
import { selectedAccountState } from '@domains/auth'
import { getErrorString } from '@util/misc'
import { gql } from 'graphql-tag'
import { useCallback, useMemo } from 'react'
import { atom, selector, useRecoilValue, useSetRecoilState } from 'recoil'
import { Team, parseTeam } from './teams'
import { selectedMultisigIdState } from '@domains/multisig'

const GET_ORGANISATIONS = gql`
  query GetOrganisations {
    organisation {
      id
      name
      slug
      teams {
        id
        name
        chain
        multisig_config
        proxied_address
      }
      users {
        role
        user {
          id
          identifier
          identifier_type
        }
      }
      plan {
        id
        max_vault
      }
    }
  }
`

type OrgUserRole = 'admin' | 'signer' | 'collaborator'

type RawOrgUser = {
  role: OrgUserRole
  user: {
    id: string
    identifier: string
    identifier_type: string
  }
}

export type RawTeam = {
  id: string
  name: string
  multisig_config: any
  proxied_address: string
  chain: string
  org_id: string
}

type Plan = {
  id: number
  max_vault: number
}

export type Organisation<TeamType = RawTeam, OrgUserType = RawOrgUser> = {
  id: string
  name: string
  slug: string
  teams: TeamType[]
  users: OrgUserType[]
  plan: Plan
}

export const organisationsState = atom<Organisation[]>({
  key: 'organisations',
  default: [],
})

export const parsedOrganisationsState = selector<Organisation<Team>[]>({
  key: 'parsedOrganisations',
  get: ({ get }) => {
    const organisations = get(organisationsState)
    const orgsWithParsedTeams = organisations.map(org => ({
      ...org,
      teams: org.teams
        .map(team => {
          const parsed = parseTeam(org, team)
          return parsed.team
        })
        .filter(team => team !== undefined) as Team[],
    }))
    return orgsWithParsedTeams.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const userOrganisationsState = selector<Organisation<Team>[]>({
  key: 'userOrganisations',
  get: ({ get }) => {
    const organisations = get(parsedOrganisationsState)
    const user = get(selectedAccountState)
    if (!user) return []

    return organisations.filter(org => org.users.some(c => c.user.id === user.id))
  },
})

export const useOrganisations = () => {
  const organisations = useRecoilValue(organisationsState)
  const userOrganisations = useRecoilValue(userOrganisationsState)
  // user with orgs on paid plan will see a slightly different layout that allows them to switch between vaults of different orgs
  const hasPaidPlan = useMemo(() => userOrganisations.some(({ plan }) => plan.max_vault > 1), [userOrganisations])

  return { organisations, hasPaidPlan, userOrganisations }
}

// sync orgs from backend to in-memory cache, which allows atoms to access the data
export const OrganisationsWatcher: React.FC = () => {
  const setOrganisations = useSetRecoilState(organisationsState)
  const handleCacheOrgs = useCallback(
    (organisations: Organisation[]) => {
      setOrganisations(prev => {
        // store new orgs that are not in prev
        const newOrgs = [...prev]
        organisations.forEach(org => {
          if (!prev.some(o => o.id === org.id)) newOrgs.push(org)
          // TODO: equality check
        })
        return newOrgs
      })
    },
    [setOrganisations]
  )

  useQuery<{ organisation: Organisation[] }>(GET_ORGANISATIONS, {
    pollInterval: 10000,
    fetchPolicy: 'cache-and-network',
    onCompleted: data => {
      if (data.organisation) handleCacheOrgs(data.organisation)
    },
  })

  return null
}

const CREATE_FREE_ORGANISATION = gql`
  mutation CreateFreeOrganisation($team: InsertMultisigProxyInput!) {
    createOrgFree(team: $team) {
      org {
        id
        name
        slug
        plan {
          id
          max_vault
        }
        teams {
          id
          chain
          delegatee_address
          multisig_config
          name
          org_id
          proxied_address
        }
        users {
          org_id
          user_id
          role
          user {
            id
            identifier
            identifier_type
          }
        }
      }
      error
      success
    }
  }
`

type CreateFreeOrgInput = {
  team: {
    name: string
    chain: string
    multisig_config: {
      signers: string[]
      threshold: number
    }
    proxied_address: string
  }
}

export const useCreateOrganisation = () => {
  const setOrganisations = useSetRecoilState(organisationsState)
  const setSelectedMultisigId = useSetRecoilState(selectedMultisigIdState)
  const [mutate, { data, loading, error }] = useMutation<
    { createOrgFree: { org?: Organisation; error?: string; success: boolean } },
    CreateFreeOrgInput
  >(CREATE_FREE_ORGANISATION, {
    onCompleted: data => {
      // add to in-memory cache if org is created successfully
      if (data.createOrgFree.org) {
        setOrganisations(prev => {
          if (data.createOrgFree.org) {
            return [
              ...prev,
              {
                id: data.createOrgFree.org.id,
                name: data.createOrgFree.org.name,
                plan: {
                  id: data.createOrgFree.org.plan.id,
                  max_vault: data.createOrgFree.org.plan.max_vault,
                },
                slug: data.createOrgFree.org.slug,
                teams: data.createOrgFree.org.teams,
                users: data.createOrgFree.org.users.map(user => ({ role: user.role, user: user.user })),
              },
            ]
          }
          return prev
        })
        const team = data.createOrgFree.org.teams[0]
        // there will be a team if the org is created successfully
        if (team) setSelectedMultisigId(team.id)
      }
    },
  })

  const createOrganisation = useCallback(
    async (team: CreateFreeOrgInput['team']) => {
      try {
        const res = await mutate({
          variables: { team },
        })

        if (res.data?.createOrgFree) {
          if (!res.data.createOrgFree.org || res.data.createOrgFree.error) {
            return { ok: false, error: res.data.createOrgFree.error }
          }
          return { ok: true }
        }
        return { ok: false, error: 'Failed to create vault.' }
      } catch (e) {
        return { ok: false, error: getErrorString(e) }
      }
    },
    [mutate]
  )

  return { createOrganisation, data, loading, error }
}
