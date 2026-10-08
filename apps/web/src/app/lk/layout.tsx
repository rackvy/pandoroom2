import LkChatFab from '@/components/LkChatFab'

export default function LkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LkChatFab />
    </>
  )
}
