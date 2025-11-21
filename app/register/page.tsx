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

  const API = process.env.NEXT_PUBLIC_API_URL   // ⭐ FIX HERE

  const handleDigiLockerAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/digilocker/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSessionId(data.session_id)
        setDigilockerStep('consent')
        alert(`DigiLocker Session Started!\nSimulating consent...`)
      } else {
        alert(data.message || 'Failed to initiate DigiLocker')
      }
    } catch {
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleDigiLockerConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const consentResponse = await fetch(`${API}/api/digilocker/simulate-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          aadhaar_number: formData.aadhaar,
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          state: formData.state,
          district: formData.district
        }),
      })

      const consentData = await consentResponse.json()

      if (consentResponse.ok && consentData.success) {
        const registerResponse = await fetch(`${API}/api/register-with-digilocker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            email: formData.email,
            phone: formData.phone,
            caste: formData.caste,
            income: parseInt(formData.income) || 0,
            age: parseInt(formData.age) || 0,
          }),
        })

        const registerData = await registerResponse.json()

        if (registerResponse.ok) {
          localStorage.setItem('token', registerData.token)
          localStorage.setItem('user', JSON.stringify(registerData.user))
          setDigilockerStep('complete')
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          alert(registerData.message || 'Registration failed')
        }
      } else {
        alert(consentData.message || 'Consent failed')
      }
    } catch {
      alert('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age),
          income: parseInt(formData.income),
          documents: {
            aadhaar: 'uploaded',
            caste_certificate: 'uploaded',
            income_certificate: 'uploaded'
          }
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      } else {
        alert(data.message || 'Registration failed')
      }
    } catch {
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
                  <TabsTrigger value="digilocker">DigiLocker</TabsTrigger>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                </TabsList>

                {/* DigiLocker PART */}
                <TabsContent value="digilocker" className="space-y-6 pt-6">
                  {digilockerStep === 'init' && (
                    <Button onClick={handleDigiLockerAuth} className="w-full" disabled={loading}>
                      {loading ? 'Initiating...' : 'Continue with DigiLocker'}
                    </Button>
                  )}

                  {digilockerStep === 'consent' && (
                    <form onSubmit={handleDigiLockerConsent} className="space-y-4">
                      <Input
                        placeholder="Aadhaar Number"
                        value={formData.aadhaar}
                        onChange={(e) => handleChange('aadhaar', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Verifying...' : 'Complete Registration'}
                      </Button>
                    </form>
                  )}

                  {digilockerStep === 'complete' && (
                    <div className="rounded-lg border bg-green-50 p-6 text-center">
                      <Check className="mx-auto mb-4 h-12 w-12 text-green-600" />
                      <h3 className="font-semibold">Registration Complete!</h3>
                    </div>
                  )}
                </TabsContent>

                {/* Manual Registration */}
                <TabsContent value="manual" className="space-y-6 pt-6">
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <Input
                      placeholder="Aadhaar Number"
                      value={formData.aadhaar}
                      onChange={(e) => handleChange('aadhaar', e.target.value)}
                      required
                      maxLength={12}
                    />

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
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
