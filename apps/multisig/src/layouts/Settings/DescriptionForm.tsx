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
  description: string
  editable?: boolean
  teamId: string
}

const UPDATE_VAULT_DESCRIPTION = gql`
  mutation UpdateTeamDescription($teamId: uuid!, $description: String!) {
    update_team_by_pk(pk_columns: { id: $teamId }, _set: { description: $description }) {
      id
      description
    }
  }
`
export const DescriptionForm: React.FC<Props> = ({ editable, description, teamId }) => {
  const [editing, setEditing] = useState(false)
  const [newDescription, setNewDescription] = useState(description)
  const setOrganisations = useSetRecoilState(organisationsState)
  const cachedDescription = useRef(description)
  const { toast } = useToast()
  const [mutate, { loading }] = useMutation<{ update_team_by_pk: { id: string; description: string } }>(
    UPDATE_VAULT_DESCRIPTION,
    {
      variables: {
        teamId,
        description: newDescription,
      },
      onCompleted: data => {
        if (data.update_team_by_pk && data.update_team_by_pk.id === teamId) {
          toast({ title: 'Multisig description updated' })
          setEditing(false)
          setOrganisations(prev => {
            const newOrgs = prev.map(org => {
              const teams = org.teams.map(team =>
                team.id === teamId ? { ...team, description: newDescription } : team
              )
              return { ...org, teams }
            })
            return newOrgs
          })
        }
      },
    }
  )

  useEffect(() => {
    if (cachedDescription.current !== description || !editing) {
      setNewDescription(description)
      cachedDescription.current = description
    }
  }, [editing, description])

  const dirty = useMemo(() => description !== newDescription, [description, newDescription])

  const handleChange = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      mutate()
    },
    [mutate]
  )

  return (
    <SettingsInfoRow label="Multisig Description" className="max-w-[50%] w-fit text-wrap xl:text-nowrap">
      <div className="flex items-center gap-[8px]">
        <p className="text-[16px] text-offWhite font-bold mt-[3px] truncate">{description}</p>
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

      <Modal isOpen={editing} width="100%" maxWidth={420} contentLabel="Edit Multisig Description">
        <form className="grid w-full gap-[16px]" onSubmit={handleChange}>
          <div className="flex items-center justify-between">
            <h1 css={{ fontSize: 20, fontWeight: 700 }}>Edit Multisig Description</h1>
            <Button onClick={() => setEditing(false)} disabled={loading} size="icon" variant="secondary" type="button">
              <X size={16} />
            </Button>
          </div>
          <Input
            label="Multisig Description"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
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
