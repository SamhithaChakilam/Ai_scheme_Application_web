'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, User } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')

  const API = process.env.NEXT_PUBLIC_API_URL // ⭐ Fix: use your Render backend

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify({ role: 'admin' })) // backend does not return user object
        router.push('/admin')
      } else {
        alert(data.message || 'Invalid credentials')
      }
    } catch (error) {
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground">Authorized access only</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Administrator Access
            </CardTitle>
            <CardDescription>
              Enter your admin credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter your user ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In as Admin'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Link href="/login">
                <Button type="button" variant="outline" className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  User Login
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 rounded-lg border-2 border-primary bg-primary/5 p-4">
          <p className="mb-2 text-sm font-medium text-primary">Admin Credentials:</p>
          <ul className="space-y-1 text-xs text-foreground/80">
            <li>• User ID: <span className="font-mono font-semibold">Samhitha</span></li>
            <li>• Password: <span className="font-mono font-semibold">Admin@sam</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
