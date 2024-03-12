import { useRecoilValue, useRecoilValueLoadable, useSetRecoilState } from 'recoil'
import { activeMultisigsState } from '../../domains/multisig'
import React, { useEffect, useState } from 'react'
import { Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CancleOrNext } from './common/CancelOrNext'
import CreateMultisig from './CreateVault'
import { ImportVault } from './ImportVault'
import { cn } from '@util/tailwindcss'
import { CircularProgressIndicator } from '@talismn/ui'
import { openScannerState, unimportedVaultsState } from '@domains/multisig/vaults-scanner'
import { Button } from '@components/ui/button'
import { Stars } from 'lucide-react'
import { X } from '@talismn/icons'

const Option: React.FC<{
  title: string
  description: string
  selected: boolean
  onClick: () => void
  belowDescription?: React.ReactNode
}> = ({ belowDescription, title, description, selected, onClick }) => (
  <div onClick={onClick} className="flex items-start gap-24 cursor-pointer group">
    <div
      className={cn(
        'p-[4ox] rounded-full transition-colors duration-150',
        selected ? 'bg-primary/20' : 'bg-primary/0 group-hover:bg-gray-500/50'
      )}
      css={({ color }) => ({
        padding: 4,
        backgroundColor: selected ? color.primaryContainer : 'rgba(0,0,0,0)',
        borderRadius: '100%',
        transition: 'background-color 0.1s',
      })}
    >
      <div
        className={cn(
          'w-[12px] h-[12px] rounded-full transition-colors duration-150',
          selected ? 'bg-primary' : 'bg-gray-500 group-hover:bg-primary/50'
        )}
      />
    </div>
    <div css={{ display: 'grid', gap: 8 }}>
      <h4 css={({ color }) => ({ margin: 0, lineHeight: 1, color: color.offWhite, fontSize: 20 })}>{title}</h4>
      <p>{description}</p>
      {belowDescription}
    </div>
  </div>
)

export const AddVault: React.FC = () => {
  const unimportedVaultsLoadable = useRecoilValueLoadable(unimportedVaultsState)
  const setOpenScanner = useSetRecoilState(openScannerState)
  const activeMultisigs = useRecoilValue(activeMultisigsState)
  const [create, setCreate] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const isNewAccount = activeMultisigs.length === 0

  const handleAddVault = () => {
    navigate(create ? 'create' : 'import')
  }

  useEffect(() => {
    if (activeMultisigs.length > 0 && location.pathname === '/add-vault') {
      const search = new URLSearchParams(location.search)
      if (search.get('redirect') === 'self') navigate(-1)
    }
  }, [activeMultisigs.length, location.pathname, location.search, navigate])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="relative grid bg-gray-900 h-fit rounded-[24px] gap-[48px] justify-center max-w-[863px] my-[50px] mx-auto py-[80px] px-[16px] w-full [&_h1]:text-center">
              {location.pathname !== '/add-vault' && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-[24px] right-[24px]"
                  asLink
                  to="/add-vault"
                >
                  <X size={20} />
                </Button>
              )}
              <Outlet />
            </div>
          }
        >
          <Route
            index
            element={
              <>
                <h1>Add a Vault{isNewAccount && ' to get started'}</h1>
                <div css={{ display: 'grid', gap: 36, maxWidth: 700 }}>
                  <Option
                    selected={create}
                    title="Create Vault"
                    description="Creates a Vault with a Pure Proxy Account controlled by Multisig"
                    onClick={() => setCreate(true)}
                  />
                  <Option
                    selected={!create}
                    title="Import Vault"
                    description="Import a Vault from an existing Proxy Account and Multisig Configuration, support Multisig control via All Proxy types"
                    onClick={() => setCreate(false)}
                    belowDescription={
                      unimportedVaultsLoadable.state === 'loading' ? (
                        <div className="px-[8px] py-[8px] flex items-center gap-[8px]">
                          <CircularProgressIndicator size={20} />
                          <p className="text-[14px] mt-[4px]">Scanning for importable vaults</p>
                        </div>
                      ) : unimportedVaultsLoadable.state === 'hasValue' ? (
                        unimportedVaultsLoadable.contents.length > 0 ? (
                          <Button
                            className="w-full text-left items-center gap-[8px] justify-start px-[8px] py-[8px] h-max min-h-max text-primary hover:text-primary focus:text-primary"
                            onClick={() => setOpenScanner(true)}
                            size="lg"
                            variant="ghost"
                          >
                            <Stars size={20} />
                            <p className="mt-[4px] text-[14px]">
                              {unimportedVaultsLoadable.contents.length} vault
                              {unimportedVaultsLoadable.contents.length > 1 ? 's' : ''} detected
                            </p>
                          </Button>
                        ) : null
                      ) : null
                    }
                  />
                </div>
                <CancleOrNext
                  cancel={isNewAccount ? undefined : { onClick: () => navigate('/overview') }}
                  next={{
                    children: 'Add Vault',
                    onClick: handleAddVault,
                  }}
                />
              </>
            }
          />

          <Route path="create" element={<CreateMultisig />} />
          <Route path="import" element={<ImportVault />} />
        </Route>
      </Routes>
    </>
  )
}
