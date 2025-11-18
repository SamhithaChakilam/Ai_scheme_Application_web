'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { CheckCircle, FileText, LogOut, Settings, Sparkles, TrendingUp, Users, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface User {
  aadhaar: string
  name: string
  email: string
  caste: string
  income: number
  age: number
  frozen: boolean
  role?: string
}

interface Scheme {
  id: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_confidence?: number
  eligibility_reason?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [eligibleSchemes, setEligibleSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    fetchEligibleSchemes(parsedUser, token)

    const interval = setInterval(() => {
      fetchEligibleSchemes(parsedUser, token, true)
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  const fetchEligibleSchemes = async (userData: User, token: string, silent = false) => {
    if (!silent) setLoading(true)
    
    try {
      const response = await fetch('http://localhost:5000/api/schemes/eligible', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_profile: userData })
      })

      const data = await response.json()
      
      if (response.ok) {
        setEligibleSchemes(data.eligible_schemes || [])
      }
    } catch (error) {
      console.error('Error fetching schemes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleRefresh = () => {
    if (user) {
      setRefreshing(true)
      const token = localStorage.getItem('token')
      if (token) {
        fetchEligibleSchemes(user, token)
      }
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Scheme Finder</span>
            </Link>
            
            <nav className="hidden gap-6 md:flex">
              <Link href="/dashboard" className="text-sm font-medium text-foreground">
                Dashboard
              </Link>
              <Link href="/schemes" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                All Schemes
              </Link>
              <Link href="/applications" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                My Applications
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Admin Panel
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">
            Here are your eligible government schemes based on your profile. <span className="text-xs">(Auto-refreshes every 30s)</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eligible Schemes</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eligibleSchemes.length}</div>
              <p className="text-xs text-muted-foreground">
                Matched by AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.frozen ? 'Verified' : 'Pending'}
              </div>
              <p className="text-xs text-muted-foreground">
                Profile is locked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Benefits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹2.5L+</div>
              <p className="text-xs text-muted-foreground">
                Potential yearly value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Eligible Schemes */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Eligible Schemes</h2>
            <Link href="/schemes">
              <Button variant="outline" size="sm">
                View All Schemes
              </Button>
            </Link>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading your eligible schemes...</p>
              </CardContent>
            </Card>
          ) : eligibleSchemes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Eligible Schemes Found</h3>
                <p className="text-muted-foreground">
                  Based on your profile, we couldn't find matching schemes at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {eligibleSchemes.map((scheme) => (
                <Card key={scheme.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between">
                      <Badge variant="secondary">{scheme.category}</Badge>
                      {scheme.eligibility_confidence && (
                        <Badge variant="outline" className="bg-success/10 text-success">
                          {Math.round(scheme.eligibility_confidence * 100)}% Match
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{scheme.name}</CardTitle>
                    <CardDescription>{scheme.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium text-muted-foreground">Benefits:</p>
                      <p className="text-sm font-semibold">{scheme.benefits}</p>
                    </div>
                    
                    <Link href={`/schemes/${scheme.id}`}>
                      <Button className="w-full">
                        View Details & Apply
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Profile Alert */}
        {user.frozen && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-warning">Profile Locked</CardTitle>
              <CardDescription>
                Your profile information is frozen. To make changes, please submit an edit request for admin approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button variant="outline">
                  Request Profile Edit
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
