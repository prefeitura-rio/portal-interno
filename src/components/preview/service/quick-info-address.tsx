'use client'

import { Check, ChevronDown, ChevronUp, Copy, MapPin } from 'lucide-react'
import { useState } from 'react'

interface QuickInfoAddressProps {
  addresses: string[]
}

interface AddressItemProps {
  address: string
}

function AddressItem({ address }: AddressItemProps) {
  return (
    <div className="flex items-center gap-3 bg-card/50 rounded-xl p-3 w-full text-left">
      {/* Pin icon muted */}
      <div className="flex-shrink-0 -ml-2">
        <MapPin className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Address text */}
      <span className="text-sm text-foreground flex-1 pr-3">{address}</span>

      {/* Copy icon */}
      <div className="flex-shrink-0">
        <Copy className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}

export function QuickInfoAddress({ addresses }: QuickInfoAddressProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // If no addresses, don't render anything
  if (!addresses || addresses.length === 0) {
    return null
  }

  // Single address - show with copy functionality
  if (addresses.length === 1) {
    return (
      <div className="flex items-center gap-4 bg-card rounded-2xl p-4 w-full">
        <div className="flex-shrink-0 text-foreground">
          <MapPin className="w-5 h-5 text-foreground-light" />
        </div>

        <div className="flex flex-col flex-1 min-w-0 items-start">
          <span className="text-xs font-normal text-foreground-light">
            Endereço
          </span>
          <span className="text-sm text-primary font-normal leading-5 tracking-normal text-left">
            {addresses[0]}
          </span>
        </div>

        <div className="flex-shrink-0">
          <Copy className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Multiple addresses - show expandable list
  return (
    <div className="bg-card rounded-2xl p-4 w-full">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-4 w-full focus:outline-none cursor-pointer"
      >
        <div className="flex-shrink-0 text-foreground">
          <MapPin className="w-5 h-5 text-foreground-light" />
        </div>

        <div className="flex flex-col flex-1 min-w-0 text-left">
          <span className="text-xs text-foreground-light">Endereços</span>
          <span className="text-sm text-primary font-normal leading-5">
            {isExpanded
              ? 'Clique aqui para recolher'
              : 'Clique aqui para visualizar'}
          </span>
        </div>

        <div className="flex-shrink-0 text-foreground-light transition-transform duration-200">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
          {addresses.map((address, index) => (
            <AddressItem key={index} address={address} />
          ))}
        </div>
      )}
    </div>
  )
}
