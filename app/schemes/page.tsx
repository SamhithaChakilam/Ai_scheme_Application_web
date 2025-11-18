'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import Link from 'next/link'

interface Scheme {
  id: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_criteria: any
}

export default function SchemesPage() {
  const router = useRouter()
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [filteredSchemes, setFilteredSchemes] = useState<Scheme[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchSchemes()
  }, [router])

  useEffect(() => {
    filterSchemes()
  }, [searchQuery, categoryFilter, schemes])

  const fetchSchemes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/schemes')
      const data = await response.json()
      setSchemes(data)
      setFilteredSchemes(data)
    } catch (error) {
      console.error('Error fetching schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSchemes = () => {
    let filtered = schemes

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(scheme => 
        scheme.category.toLowerCase() === categoryFilter.toLowerCase()
      )
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(scheme =>
        scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredSchemes(filtered)
  }

  const categories = ['all', ...Array.from(new Set(schemes.map(s => s.category)))]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">All Government Schemes</h1>
          <p className="text-muted-foreground">
            Browse all available schemes and check your eligibility
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search schemes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredSchemes.length} of {schemes.length} schemes
          </p>
        </div>

        {/* Schemes Grid */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading schemes...</p>
            </CardContent>
          </Card>
        ) : filteredSchemes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">No Schemes Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSchemes.map((scheme) => (
              <Card key={scheme.id} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Badge variant="secondary" className="mb-2 w-fit">
                    {scheme.category}
                  </Badge>
                  <CardTitle className="text-lg">{scheme.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {scheme.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Benefits:</p>
                    <p className="line-clamp-2 text-sm font-semibold">{scheme.benefits}</p>
                  </div>
                  
                  <Link href={`/schemes/${scheme.id}`}>
                    <Button className="w-full" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
