import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SettingsInfoRow } from './InfoRow'
import { Button } from '@components/ui/button'
import { Edit, X } from 'lucide-react'
import { Input } from '@components/ui/input'
import Modal from '@components/Modal'
import { useMutation } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useToast } from '@components/ui/use-toast'
import { organisationsState } from '@domains/offchain-data'
import { useSetRecoilState } from 'recoil'

type Props = {
  name: string
  editable?: boolean
  teamId: string
}

const UPDATE_VAULT_NAME = gql`
  mutation UpdateTeamName($teamId: uuid!, $name: String!) {
    update_team_by_pk(pk_columns: { id: $teamId }, _set: { name: $name }) {
      id
      name
    }
  }
`
export const NameForm: React.FC<Props> = ({ editable, name, teamId }) => {
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(name)
  const setOrganisations = useSetRecoilState(organisationsState)
  const cachedName = useRef(name)
  const { toast } = useToast()
  const [mutate, { loading }] = useMutation<{ update_team_by_pk: { id: string; name: string } }>(UPDATE_VAULT_NAME, {
    variables: {
      teamId,
      name: newName,
    },
    onCompleted: data => {
      if (data.update_team_by_pk && data.update_team_by_pk.id === teamId) {
        toast({ title: 'Vault name updated' })
        setEditing(false)
        setOrganisations(prev => {
          const newOrgs = prev.map(org => {
            const teams = org.teams.map(team => (team.id === teamId ? { ...team, name: newName } : team))
            return { ...org, teams }
          })
          return newOrgs
        })
      }
    },
  })

  useEffect(() => {
    if (cachedName.current !== name || !editing) {
      setNewName(name)
      cachedName.current = name
    }
  }, [editing, name])

  const dirty = useMemo(() => name !== newName, [name, newName])

  const handleChange = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      mutate()
    },
    [mutate]
  )

  return (
    <SettingsInfoRow label="Vault Name">
      <div className="flex items-center justify-start gap-[8px]">
        <p className="text-[16px] text-offWhite font-bold mt-[3px]">{name}</p>
        {editable && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="!focus-visible:ring-0 !ring-0 focus-visible:ring-transparent outline-none focus-visible:outline-none ring-offset-0 focus-visible:ring-offset-transparent"
          >
            <Edit size={16} />
          </Button>
        )}
      </div>

      <Modal isOpen={editing} width="100%" maxWidth={420} contentLabel="Edit Vault Name">
        <form className="grid w-full gap-[16px]" onSubmit={handleChange}>
          <div className="flex items-center justify-between">
            <h1 css={{ fontSize: 20, fontWeight: 700 }}>Edit Vault Name</h1>
            <Button onClick={() => setEditing(false)} disabled={loading} size="icon" variant="secondary" type="button">
              <X size={16} />
            </Button>
          </div>
          <Input label="Vault Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="grid grid-cols-2 gap-[8px] w-full">
            <Button
              className="w-full"
              variant="outline"
              disabled={loading}
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button className="w-full" disabled={!dirty || loading} loading={loading} type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </SettingsInfoRow>
  )
}
