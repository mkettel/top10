import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-offwhite items-center justify-center">
      <h1 className='font-outfit text-6xl'>Welcome to the private page!</h1>
    </div>
  )
}