// /private/simple/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'

// Define types for our data
interface ListItem {
  id: string
  name: string
  details?: string
  rank: number
  list_id: string
}

interface Category {
  id: string
  name: string
}

interface List {
  id: string
  title: string
  source_url?: string
  categories: Category
}

export default function SimpleGame() {
  const [list, setList] = useState<List | null>(null)
  const [listItems, setListItems] = useState<ListItem[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const supabase = createClient()

  // Function to fetch a random list
  const fetchRandomList = async () => {
    setIsLoading(true)
    try {
      // First, get the count of all lists
      const { count, error: countError } = await supabase
        .from('lists')
        .select('*', { count: 'exact', head: true })
      
      if (countError) throw countError
      
      // Generate a random index
      const randomIndex = Math.floor(Math.random() * (count || 0))
      
      // Get a random list
      const { data: lists, error: listError } = await supabase
        .from('lists')
        .select('*, categories!inner(*)')
        .range(randomIndex, randomIndex)
      
      if (listError) throw listError
      
      if (lists && lists.length > 0) {
        const randomList = lists[0] as List
        setList(randomList)
        setCategory(randomList.categories)
        
        // Fetch items for this list
        const { data: items, error: itemsError } = await supabase
          .from('list_items')
          .select('*')
          .eq('list_id', randomList.id)
          .order('rank', { ascending: true })
        
        if (itemsError) throw itemsError
        
        setListItems(items as ListItem[] || [])
      }
    } catch (error) {
      console.error('Error fetching random list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch a random list on initial load
  useEffect(() => {
    fetchRandomList()
  }, [])

  return (
    <div className="min-h-screen bg-new-blue text-offwhite flex flex-col">
      <header className="p-4 border-b border-white/20">
        <h1 className="text-2xl font-bold text-center">Top 10 Simple Mode</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col items-center max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl">Loading list...</div>
          </div>
        ) : list ? (
          <div className="w-full space-y-6">
            {/* List header */}
            <div className="bg-white/10 p-6 rounded-lg text-center">
              <div className="text-sm text-white/60 mb-1">
                {category?.name || 'Unknown Category'}
              </div>
              <h2 className="text-3xl font-bold mb-4">{list.title}</h2>
              
              {list.source_url && (
                <a 
                  href={list.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 text-sm flex items-center justify-center"
                >
                  <span>Source</span>
                  <ExternalLink size={14} className="ml-1" />
                </a>
              )}
            </div>

            {/* List items */}
            {/* <div className="bg-white/10 p-4 rounded-lg">
              <ol className="space-y-3">
                {listItems.map((item) => (
                  <li key={item.id} className="flex p-3 bg-white/5 rounded-md">
                    <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full mr-3">
                      {item.rank}
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.details && (
                        <div className="text-sm text-white/70">{item.details}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div> */}

            {/* Next list button */}
            <button
              onClick={fetchRandomList}
              disabled={isLoading}
              className="w-full py-4 bg-white text-new-blue font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center"
            >
              <RefreshCw size={20} className="mr-2" />
              Get Another Random List
            </button>

            <Link 
              href="/private"
              className="block w-full py-3 bg-white/10 text-white text-center font-semibold rounded-lg hover:bg-white/20 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl">No lists found. Try again.</div>
          </div>
        )}
      </main>
    </div>
  )
}