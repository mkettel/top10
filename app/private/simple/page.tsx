'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ExternalLink, RefreshCw, Info, X } from 'lucide-react'

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
  const [showRules, setShowRules] = useState<boolean>(false)
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
      <header className="p-4 border-b border-white/20 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-center flex-1">Top 10 Simple Mode</h1>
        <button 
          onClick={() => setShowRules(true)}
          className="p-2 rounded-full hover:bg-white/10"
          aria-label="Show rules"
        >
          <Info size={20} />
        </button>
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

      {/* Rules Dialog */}
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-new-blue border border-white/20 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-white/20">
              <h2 className="text-xl font-bold">How to Play Top 10</h2>
              <button 
                onClick={() => setShowRules(false)}
                className="p-2 rounded-full hover:bg-white/10"
                aria-label="Close rules"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-white/90">
                Welcome to the ultimate game of knowledge, where you'll compete with your friends 
                in a draft-style challenge to see who can guess the most correct answers in the 
                top 10 of a variety of lists and rankings found throughout the internet.
              </p>
              
              <h3 className="text-lg font-bold mt-6">How to Play</h3>
              
              <ol className="list-decimal pl-5 space-y-4">
                <li>
                  One player will act as the 'Judge' and will not participate in the competition. 
                  However, the Judge plays a crucial role, as their decisions and interpretation 
                  of the list could ultimately decide the winner. The Judge has full control over the game.
                </li>
                <li>
                  The Judge's first task is to determine the draft order. This order should generally 
                  follow the sequence of how players are seated. The Judge will decide who goes first.
                </li>
                <li>
                  The Judge selects a card to kick off the game and announces it for all to hear.
                </li>
                <li>
                  While the players begin thinking, the Judge should review the list. They are 
                  encouraged to be as transparent as possible about the list's details and may 
                  choose to share information such as the source of the data, how it was measured, 
                  the year it was created, etc.
                </li>
                <li>
                  Based on their review of the list, the Judge will decide whether the draft will 
                  be serpentine or fixed.
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      Generally, a serpentine draft works best with more players, while a fixed 
                      draft is usually sufficient with fewer players, especially if the judge 
                      wishes to award a handicap to the player who goes first.
                    </li>
                    <li>
                      The judge also has the authority to change who goes first after his review.
                    </li>
                  </ul>
                </li>
                <li>
                  As soon as the judge is ready, the first player is free to make their guess. 
                  If the answer is in the top 10, they earn 1 point, regardless of its exact ranking. 
                  When a correct answer is given, the Judge should announce its position in the top 10 
                  and may also provide the relevant statistic, if available.
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      It is up to the judge to deem a guess correct. It does not always have to be 
                      exact to earn a point.
                    </li>
                  </ul>
                </li>
                <li>
                  The game continues in the order selected by the Judge until the entire top 10 is 
                  guessed. At the end of the game, the player with the most points wins.
                </li>
              </ol>
              
              <h3 className="text-lg font-bold mt-6">Additional Rules and Notes</h3>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>The Judge may provide hints at any time to keep the game moving.</li>
                <li>
                  Each player is allowed to ask the Judge one question at any time during the game. 
                  The Judge has the right to reject the question if they feel the answer is unjust, 
                  forfeiting the players only guess.
                </li>
                <li>
                  There is no shot clock. It is at the Judge's discretion to skip a player if they 
                  are taking too long. A player is also encouraged to 'pass' if they simply have no idea.
                </li>
              </ul>
              
              <h3 className="text-lg font-bold mt-6">Overtime</h3>
              
              <p className="text-white/90 mb-2">In the event of a tie, the tied players compete in a lightning round:</p>
              
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  The judge selects the highest-ranked item on the list that has not been guessed yet.
                </li>
                <li>
                  The Judge then provides hints about the answer until it is guessed.
                </li>
                <li>
                  Any player may guess at any time. However, once a player guesses, they cannot guess 
                  again until the other player(s) have made their guess.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}