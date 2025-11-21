'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { Lock, Edit, AlertCircle } from 'lucide-react'

interface User {
  aadhaar: string
  name: string
  email: string
  phone: string
  age: number
  gender: string
  caste: string
  income: number
  state: string
  district: string
  frozen: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [editChanges, setEditChanges] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-scheme-application-web.onrender.com'

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
  }, [router])

  const handleSubmitEditRequest = async () => {
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API}/api/edit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          changes: { description: editChanges },
          reason: editReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Edit request submitted successfully! Admin will review your request.')
        setShowEditRequest(false)
        setEditReason('')
        setEditChanges('')
      } else {
        alert(data.message || 'Failed to submit request')
      }
    } catch (error) {
      alert('Error submitting request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">
            View your registered information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  {user.frozen && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Your profile is frozen and cannot be edited directly
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Aadhaar Number</Label>
                    <Input value={user.aadhaar} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={user.name} disabled />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={user.phone} disabled />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input value={user.age} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Input value={user.gender} disabled />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Caste Category</Label>
                    <Input value={user.caste.toUpperCase()} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Income</Label>
                    <Input value={`₹${user.income.toLocaleString()}`} disabled />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={user.state} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input value={user.district} disabled />
                  </div>
                </div>

              </CardContent>
            </Card>

            {showEditRequest && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Request Profile Edit</CardTitle>
                  <CardDescription>
                    Describe the changes you need and provide a reason
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  
                  <div className="space-y-2">
                    <Label htmlFor="changes">Requested Changes</Label>
                    <Textarea
                      id="changes"
                      placeholder="E.g., Update phone number to 9876543210, update income to ₹150,000"
                      value={editChanges}
                      onChange={(e) => setEditChanges(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Change</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why these changes are needed"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSubmitEditRequest}
                      disabled={!editChanges || !editReason || submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={() => setShowEditRequest(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">Profile Locked</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Your profile is frozen to prevent fraud. To make changes, submit an edit request for admin approval.
                </p>

                {!showEditRequest && (
                  <Button 
                    onClick={() => setShowEditRequest(true)}
                    className="w-full"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Request Edit
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Aadhaar Card</span>
                    <Badge variant="outline" className="bg-success/10 text-success">Verified</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Caste Certificate</span>
                    <Badge variant="outline" className="bg-success/10 text-success">Verified</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Income Certificate</span>
                    <Badge variant="outline" className="bg-success/10 text-success">Verified</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  )
}
