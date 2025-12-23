import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/components/Theme-provider'

function Settings() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
  }, [navigate])

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match!')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    // Mock password change
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setMessage('Password changed successfully!')
    setTimeout(() => setMessage(''), 3000)
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        {message && (
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg">
            {message}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Reset Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-2">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors"
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings