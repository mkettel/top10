'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

export default function LoginPage() {
  // State management
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  // Password validation
  const [passwordValid, setPasswordValid] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  
  // Form submission with custom error handling
  const handleSubmit = async (event: any) => {
    event.preventDefault()
    setError('')
    
    // Validate password on login/signup attempt
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      
      if (isLogin) {
        const result = await login(formData)
        if (result?.error) {
          if (result.error.message.includes('user not found')) {
            setError('Account not found. Please sign up instead.')
            return
          }
          setError(result.error.message || 'Login failed')
        }
      } else {
        const result = await signup(formData)
        if (result?.error) {
          setError(result.error.message || 'Signup failed')
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    }
  }
  
  // Password validation function
  const validatePassword = (value: any) => {
    const isValid = value.length >= 8
    setPasswordValid(isValid)
    
    if (passwordTouched && !isValid) {
      setError('Password must be at least 8 characters long')
    } else {
      setError('')
    }
  }
  
  const handlePasswordChange = (e: any) => {
    const value = e.target.value
    setPassword(value)
    validatePassword(value)
  }
  
  return (
    <div className="flex  items-center justify-center h-screen bg-offwhite">
      <form 
        onSubmit={handleSubmit}
        className="bg-new-blue m-2 p-8 max-w-xl w-full rounded-md shadow-md"
      >
        <div className="flex mb-8">
          <h1 className="text-4xl font-outfit text-offwhite">
            {isLogin ? 'Log in' : 'Sign up'}
          </h1>
        </div>
        
        {error && (
          <div className="bg-red-500 border-l-4 border-red-500 text-red-100 p-4 mb-4 rounded">
            <p>{error}, please sign up</p>
            {error.includes('Please sign up instead') && (
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className="mt-2 underline text-red-700 font-bold"
              >
                Switch to sign up
              </button>
            )}
          </div>
        )}
        
        <div className="flex flex-col text-offwhite space-y-2">
          <label htmlFor="email" className="text-lg">Email:</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 rounded bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
          />
          
          <label htmlFor="password" className="text-lg">Password:</label>
          <div className="relative">
            <input 
              id="password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => setPasswordTouched(true)}
              className={`px-4 py-2 rounded w-full bg-white/10 border focus:outline-none focus:ring-2 focus:ring-white/50 text-white
                ${!passwordValid && passwordTouched ? 'border-red-500' : 'border-white/20'}`}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
            >
              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
          
          {passwordTouched && !passwordValid && (
            <p className="text-red-400 text-sm">Password must be at least 8 characters</p>
          )}
          
          <button 
            type="submit"
            className="bg-white text-new-blue py-2 px-4 rounded-md font-semibold mt-4 hover:bg-white/90 transition-colors"
          >
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
          
          <div className="flex justify-center mt-4 text-white/80">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                className="ml-2 underline text-white hover:cursor-pointer font-semibold"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}