import { MarketplaceShell } from '@/components/marketplace-vibe/MarketplaceShell'

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketplaceShell>{children}</MarketplaceShell>
}
