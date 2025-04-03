'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Validate inputs
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: { message: 'Email and password are required' } }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Return the error instead of redirecting
    return { error }
  }

  revalidatePath('/', 'layout')
  redirect('/private')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Validate inputs
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: { message: 'Email and password are required' } }
  }

  if (password.length < 8) {
    return { error: { message: 'Password must be at least 8 characters long' } }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    // Return the error instead of redirecting
    return { error }
  }

  // Check if email confirmation is required
  if (data?.user?.identities?.length === 0) {
    return { 
      success: true, 
      message: 'Account already exists. Please login instead.' 
    }
  }

  revalidatePath('/', 'layout')
  redirect('/login') // Redirect to a verification page
}