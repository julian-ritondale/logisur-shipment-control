import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HomePage } from '@/pages/home-page'

function App() {
  return (
    <TooltipProvider>
      <AppShell>
        <HomePage />
      </AppShell>
      <Toaster theme="light" richColors position="top-right" />
    </TooltipProvider>
  )
}

export default App
