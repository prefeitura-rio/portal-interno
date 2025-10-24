import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface OptionsStepProps {
  onSelect: (mode: 'manual' | 'spreadsheet') => void
}

export function OptionsStep({ onSelect }: OptionsStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Como deseja incluir os participantes?</h3>
      </div>

      <div className="flex flex-col w-full gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSelect('manual')}
          className="flex items-center justify-center gap-2 border-2 transition-all hover:border-primary hover:bg-primary/10 cursor-pointer"
        >
          <UserPlus className="h-5 w-5 text-primary" />
          <span className="font-medium">Incluir manualmente</span>
        </Button>

        {/* <Button
          variant="outline"
          size="lg"
          onClick={() => onSelect('spreadsheet')}
          className="flex items-center justify-center gap-2 border-2 transition-all hover:border-primary hover:bg-primary/10 cursor-pointer"
        >
          <Upload className="h-5 w-5 text-primary" />
          <span className="font-medium">Incluir via planilha</span>
        </Button> */}
      </div>
    </div>
  )
}
