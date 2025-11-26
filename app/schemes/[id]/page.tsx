'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Scheme {
  id?: string
  _id?: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_criteria: any
  documents_required: string[]
}

export default function SchemeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const schemeId = params.id as string

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-scheme-application-web.onrender.com'

  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheme()
  }, [schemeId])

  const fetchScheme = async () => {
    try {
      // Try normal scheme fetch
      const res = await fetch(`${API}/api/schemes/${schemeId}`)
      const data = await res.json()

      // If scheme exists → good
      if (res.ok && data.name) {
        setScheme(data)
        setLoading(false)
        return
      }

      // FALLBACK: fetch all schemes and search by id OR _id
      const allRes = await fetch(`${API}/api/schemes`)
      const allSchemes = await allRes.json()

      const found = allSchemes.find((s: any) =>
        s.id === schemeId || s._id === schemeId
      )

      if (found) {
        setScheme(found)
      } else {
        alert("Scheme not found")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !scheme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading scheme details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">

        <Link href="/schemes" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Schemes
        </Link>

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">
              {scheme.category}
            </Badge>
            <CardTitle className="text-2xl">{scheme.name}</CardTitle>
            <CardDescription className="text-base">{scheme.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Benefits</h3>
              <div className="rounded-lg bg-primary/5 p-4">
                <p className="text-sm">{scheme.benefits}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Eligibility Criteria</h3>
              <pre className="text-sm bg-muted p-3 rounded">
                {JSON.stringify(scheme.eligibility_criteria, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Required Documents</h3>
              <ul className="space-y-2">
                {scheme.documents_required.map((doc, i) => (
                  <li key={i} className="flex gap-2 items-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
