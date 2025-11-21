'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Upload, Check } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [digilockerStep, setDigilockerStep] = useState<'init' | 'consent' | 'complete'>('init')
  const [sessionId, setSessionId] = useState('')
  const [formData, setFormData] = useState({
    aadhaar: '',
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    caste: '',
    income: '',
    state: '',
    district: '',
    dob: ''
  })

  // Use env var with fallback to localhost for local dev
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  // Helper to safely parse JSON responses
  const parseJSON = async (res: Response) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  const handleDigiLockerAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/digilocker/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await parseJSON(response)

      if (response.ok && data && data.success) {
        setSessionId(data.session_id)
        setDigilockerStep('consent')
        alert(
          `DigiLocker Session Started!\n\nIn production you'd be redirected to:\n${data.consent_url || 'consent_url'}\n\nFor sandbox, we'll simulate consent.`
        )
      } else {
        alert((data && data.message) || 'Failed to initiate DigiLocker')
      }
    } catch (error) {
      console.error(error)
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleDigiLockerConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic validation
      if (!formData.aadhaar || formData.aadhaar.trim().length < 12) {
        alert('Please enter a valid Aadhaar number (12 digits).')
        setLoading(false)
        return
      }

      const consentResponse = await fetch(`${API}/api/digilocker/simulate-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          aadhaar_number: formData.aadhaar.trim(),
          name: formData.name.trim(),
          dob: formData.dob,
          gender: formData.gender,
          state: formData.state.trim(),
          district: formData.district.trim()
        }),
      })

      const consentData = await parseJSON(consentResponse)

      if (consentResponse.ok && consentData && consentData.success) {
        const registerResponse = await fetch(`${API}/api/register-with-digilocker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            email: formData.email?.trim() || '',
            phone: formData.phone?.trim() || '',
            caste: formData.caste || '',
            income: Number(formData.income) || 0,
            age: Number(formData.age) || 0,
          }),
        })

        const registerData = await parseJSON(registerResponse)

        if (registerResponse.ok && registerData) {
          // store token/user as backend returns
          if (registerData.token) localStorage.setItem('token', registerData.token)
          if (registerData.user) localStorage.setItem('user', JSON.stringify(registerData.user))
          setDigilockerStep('complete')
          setTimeout(() => router.push('/dashboard'), 1200)
        } else {
          alert((registerData && registerData.message) || 'Registration failed')
        }
      } else {
        alert((consentData && consentData.message) || 'Consent failed')
      }
    } catch (error) {
      console.error(error)
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic validation
      if (!formData.aadhaar || formData.aadhaar.trim().length < 12) {
        alert('Please enter a valid Aadhaar number (12 digits).')
        setLoading(false)
        return
      }

      const response = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          aadhaar: formData.aadhaar.trim(),
          age: Number(formData.age) || undefined,
          income: Number(formData.income) || undefined,
          documents: {
            aadhaar: 'uploaded',
            caste_certificate: 'uploaded',
            income_certificate: 'uploaded'
          }
        }),
      })

      const data = await parseJSON(response)

      if (response.ok && data) {
        if (data.token) localStorage.setItem('token', data.token)
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      } else {
        alert((data && data.message) || 'Registration failed')
      }
    } catch (error) {
      console.error(error)
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">One Aadhaar, One Account</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold">Create Your Account</h1>
            <p className="text-muted-foreground">
              Register once and discover all schemes you qualify for
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registration Form</CardTitle>
              <CardDescription>
                Choose your preferred registration method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="digilocker" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="digilocker">DigiLocker (Recommended)</TabsTrigger>
                  <TabsTrigger value="manual">Manual Registration</TabsTrigger>
                </TabsList>

                <TabsContent value="digilocker" className="space-y-6 pt-6">
                  {digilockerStep === 'init' && (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-blue-50 p-4">
                        <h3 className="mb-2 font-semibold text-blue-900">Why Use DigiLocker?</h3>
                        <ul className="space-y-1 text-sm text-blue-700">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Instant Aadhaar verification
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Auto-fill verified details
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Secure government authentication
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            No manual document upload needed
                          </li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleDigiLockerAuth}
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? 'Initiating...' : 'Continue with DigiLocker'}
                      </Button>
                    </div>
                  )}

                  {digilockerStep === 'consent' && (
                    <form onSubmit={handleDigiLockerConsent} className="space-y-4">
                      <div className="rounded-lg border bg-green-50 p-4">
                        <p className="text-sm text-green-800">
                          DigiLocker session initiated. Please provide your Aadhaar details to simulate the consent process.
                        </p>
                        <p className="mt-2 text-xs text-green-600">
                          Session ID: {sessionId}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dl-aadhaar">Aadhaar Number *</Label>
                        <Input
                          id="dl-aadhaar"
                          placeholder="XXXX XXXX XXXX"
                          value={formData.aadhaar}
                          onChange={(e) => handleChange('aadhaar', e.target.value.replace(/\s+/g, ''))}
                          required
                          maxLength={12}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dl-name">Full Name *</Label>
                        <Input
                          id="dl-name"
                          placeholder="As per Aadhaar"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="dl-dob">Date of Birth *</Label>
                          <Input
                            id="dl-dob"
                            type="date"
                            value={formData.dob}
                            onChange={(e) => handleChange('dob', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dl-gender">Gender *</Label>
                          <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="dl-state">State *</Label>
                          <Input
                            id="dl-state"
                            placeholder="Enter state"
                            value={formData.state}
                            onChange={(e) => handleChange('state', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dl-district">District *</Label>
                          <Input
                            id="dl-district"
                            placeholder="Enter district"
                            value={formData.district}
                            onChange={(e) => handleChange('district', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dl-email">Email Address</Label>
                        <Input
                          id="dl-email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dl-phone">Phone Number *</Label>
                        <Input
                          id="dl-phone"
                          placeholder="10-digit number"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="dl-age">Age *</Label>
                          <Input
                            id="dl-age"
                            type="number"
                            placeholder="Age"
                            value={formData.age}
                            onChange={(e) => handleChange('age', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dl-caste">Caste Category *</Label>
                          <Select value={formData.caste} onValueChange={(value) => handleChange('caste', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="sc">SC</SelectItem>
                              <SelectItem value="st">ST</SelectItem>
                              <SelectItem value="obc">OBC</SelectItem>
                              <SelectItem value="ews">EWS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dl-income">Annual Income *</Label>
                          <Input
                            id="dl-income"
                            type="number"
                            placeholder="Income"
                            value={formData.income}
                            onChange={(e) => handleChange('income', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Verifying & Creating Account...' : 'Complete Registration'}
                      </Button>
                    </form>
                  )}

                  {digilockerStep === 'complete' && (
                    <div className="rounded-lg border bg-green-50 p-6 text-center">
                      <Check className="mx-auto mb-4 h-12 w-12 text-green-600" />
                      <h3 className="mb-2 text-lg font-semibold text-green-900">Registration Complete!</h3>
                      <p className="text-sm text-green-700">
                        Your account has been verified via DigiLocker. Redirecting to dashboard...
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-6 pt-6">
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar Number *</Label>
                      <Input
                        id="aadhaar"
                        placeholder="XXXX XXXX XXXX"
                        value={formData.aadhaar}
                        onChange={(e) => handleChange('aadhaar', e.target.value.replace(/\s+/g, ''))}
                        required
                        maxLength={12}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="As per Aadhaar"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="age">Age *</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="Enter age"
                          value={formData.age}
                          onChange={(e) => handleChange('age', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          placeholder="10-digit number"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="caste">Caste Category *</Label>
                        <Select value={formData.caste} onValueChange={(value) => handleChange('caste', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="sc">SC</SelectItem>
                            <SelectItem value="st">ST</SelectItem>
                            <SelectItem value="obc">OBC</SelectItem>
                            <SelectItem value="ews">EWS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="income">Annual Income (₹) *</Label>
                      <Input
                        id="income"
                        type="number"
                        placeholder="Enter annual income"
                        value={formData.income}
                        onChange={(e) => handleChange('income', e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          placeholder="Enter state"
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="district">District *</Label>
                        <Input
                          id="district"
                          placeholder="Enter district"
                          value={formData.district}
                          onChange={(e) => handleChange('district', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        <span className="font-medium">Required Documents</span>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Aadhaar Card (Front & Back)</li>
                        <li>• Caste Certificate (if applicable)</li>
                        <li>• Income Certificate</li>
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Note: For demo purposes, documents are auto-marked as uploaded
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                          Sign In
                        </Link>
                      </p>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
