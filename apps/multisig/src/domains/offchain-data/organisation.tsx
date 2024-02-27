import { useMutation, useQuery } from '@apollo/client'
import { selectedAccountState } from '@domains/auth'
import { getErrorString } from '@util/misc'
import { gql } from 'graphql-tag'
import { useCallback, useMemo } from 'react'
import { atom, selector, useRecoilValue, useSetRecoilState } from 'recoil'
import { Team, parseTeam } from './teams'
import { selectedMultisigIdState } from '@domains/multisig'
import { Address } from '@util/addresses'
import { captureException } from '@sentry/react'
import { useToast } from '@components/ui/use-toast'
import { isEqual } from 'lodash'

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

const isSameOrgs = (a: Organisation, b: Organisation) => {
  const sameName = a.name === b.name
  const sameId = a.id === b.id
  const samePlan = a.plan.max_vault === b.plan.max_vault
  const sameSlug = a.slug === b.slug
  const sameUsers =
    a.users.map(u => `${u.role}-${u.user.id}`).join(',') === b.users.map(u => `${u.role}-${u.user.id}`).join(',')
  const sameTeams = isEqual(a.teams, b.teams)
  return sameName && sameId && samePlan && sameSlug && sameUsers && sameTeams
}

// sync orgs from backend to in-memory cache, which allows atoms to access the data
export const OrganisationsWatcher: React.FC = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const setOrganisations = useSetRecoilState(organisationsState)
  const handleCacheOrgs = useCallback(
    (organisations: Organisation[]) => {
      setOrganisations(prev => {
        // store new orgs that are not in prev
        const newOrgs = [...prev]
        organisations.forEach(org => {
          const existIndex = newOrgs.findIndex(o => o.id === org.id)
          if (existIndex < 0) {
            newOrgs.push(org)
          } else {
            const exists = newOrgs[existIndex]
            if (exists && !isSameOrgs(exists, org)) newOrgs[existIndex] = org
          }
        })
        return newOrgs
      })
    },
    [setOrganisations]
  )

  useQuery<{ organisation: Organisation[] }>(GET_ORGANISATIONS, {
    skip: !selectedAccount,
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

const ADD_ORG_COLLABORATOR_MUTATION = gql`
  mutation AddNewOrgCollaborator($collaborator: AddOrgCollaboratorInput!) {
    addOrgCollaborator(collaborator: $collaborator) {
      success
      userId
      error
      role
    }
  }
`

export const useAddOrgCollaborator = () => {
  const setOrganisations = useSetRecoilState(organisationsState)
  const [mutate, { loading }] = useMutation(ADD_ORG_COLLABORATOR_MUTATION)
  const { toast } = useToast()
  const addCollaborator = useCallback(
    async (address: Address, orgId: string) => {
      try {
        const { data } = await mutate({
          variables: {
            collaborator: {
              address: address.toSs58(),
              org_id: orgId,
            },
          },
        })

        // try to update in-memory cache
        if (data?.addOrgCollaborator?.success) {
          setOrganisations(prev => {
            const newOrgs = [...prev]
            const orgIndex = newOrgs.findIndex(org => org.id === orgId)
            if (orgIndex === -1) return prev

            const org = newOrgs[orgIndex]
            if (!org) return prev

            newOrgs[orgIndex] = {
              ...org,
              users: [
                ...org.users,
                {
                  role: data.addOrgCollaborator.role,
                  user: {
                    id: data.addOrgCollaborator.userId,
                    identifier: address.toSs58(),
                    identifier_type: 'address',
                  },
                },
              ],
            }

            return newOrgs
          })
          toast({
            title: 'Added collaborator',
          })
          return true
        }
      } catch (e) {
        console.error(e)
        captureException(e)
        toast({
          title: 'Failed to add collaborator',
          description: getErrorString(e),
        })
        return false
      }
    },
    [mutate, setOrganisations, toast]
  )

  return { addCollaborator, adding: loading }
}

export const useDeleteCollaborator = () => {
  const setOrganisations = useSetRecoilState(organisationsState)
  const { toast } = useToast()
  const [mutate, { loading }] = useMutation<{
    delete_organisation_user_role_by_pk: {
      org_id: string
      user_id: string
      role: string
    } | null
  }>(gql`
    mutation DeleteCollaborator($orgId: uuid!, $userId: uuid!) {
      delete_organisation_user_role_by_pk(org_id: $orgId, user_id: $userId) {
        org_id
        user_id
        role
      }
    }
  `)

  const deleteCollaborator = useCallback(
    async (orgId: string, userId: string) => {
      const { data, errors } = await mutate({
        variables: { orgId, userId },
      })

      if (data?.delete_organisation_user_role_by_pk) {
        setOrganisations(prev => {
          const newOrgs = [...prev]
          const orgIndex = newOrgs.findIndex(org => org.id === orgId)

          if (orgIndex >= 0) {
            const newOrg = newOrgs[orgIndex]
            if (!newOrg) return newOrgs

            newOrgs[orgIndex] = {
              ...newOrg,
              users: newOrg.users.filter(u => u.user.id !== userId),
            }
          }
          return newOrgs
        })
        toast({
          title: 'Removed collaborator',
        })
      }

      if (errors) {
        console.error(errors)
        captureException(errors)
        return false
      }
    },
    [mutate, setOrganisations, toast]
  )

  return { deleteCollaborator, deleting: loading }
}
