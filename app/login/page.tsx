import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-offwhite">
      <form className='bg-new-blue p-8 max-w-xl w-full rounded-md shadow-md'>
        <div className="flex">
          <h1 className='text-4xl font-fun text-offwhite'>Log in</h1>
        </div>
        <div className="flex flex-col text-offwhite space-y-4">
          <label htmlFor="email">Email:</label>
          <input id="email" name="email" type="email" required />
          <label htmlFor="password">Password:</label>
          <input id="password" name="password" type="password" required />
          <button formAction={login}>Log in</button>
          <button formAction={signup}>Sign up</button>
        </div>
      </form>
    </div>
  )
}