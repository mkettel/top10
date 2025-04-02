'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowRight, ArrowLeft, ExternalLink, Info } from 'lucide-react'

// Types
interface CategoryType {
  id: string
  name: string
  icon: string
  description?: string
}

interface ListType {
  id: string
  title: string
  description: string | null
  source_url: string | null
}

export default function CategorySelectionPage() {
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0)
  const [lists, setLists] = useState<ListType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadingLists, setLoadingLists] = useState<boolean>(false)
  const [showLists, setShowLists] = useState<boolean>(false)
  const [selectedList, setSelectedList] = useState<ListType | null>(null)
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [isJudge, setIsJudge] = useState<boolean>(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get the current category
  const currentCategory = categories[currentCategoryIndex] || null

  // Touch handling for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  // Fetch categories and check if user is judge
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      
      try {
        // Check if user is judge
        const storedIsJudge = localStorage.getItem('isJudge')
        
        if (storedIsJudge === 'false') {
          setIsJudge(false)
        }
        
        // Get round ID from URL or localStorage
        const roundIdParam = searchParams.get('roundId')
        if (roundIdParam) {
          setRoundId(roundIdParam)
        } else {
          const storedRoundId = localStorage.getItem('currentRoundId')
          if (storedRoundId) {
            setRoundId(storedRoundId)
          }
        }
        
        // Fetch categories from Supabase
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name')
        
        if (error) throw error
        
        if (data && data.length > 0) {
          setCategories(data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCategories()
  }, [searchParams, supabase])

  // Touch event handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      handleNextCategory()
    }
    if (isRightSwipe) {
      handlePreviousCategory()
    }
  }

  // Navigation handlers
  const handleNextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1)
      setShowLists(false)
      setSelectedList(null)
      setShowConfirmation(false)
    }
  }

  const handlePreviousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1)
      setShowLists(false)
      setSelectedList(null)
      setShowConfirmation(false)
    }
  }

  const handleSelectCategory = async () => {
    if (!currentCategory) return
    
    setLoadingLists(true)
    
    try {
      // Fetch lists for this category
      const { data, error } = await supabase
        .from('lists')
        .select('id, title, description, source_url')
        .eq('category_id', currentCategory.id)
      
      if (error) throw error
      
      setLists(data || [])
      setShowLists(true)
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoadingLists(false)
    }
  }

  const handleSelectList = (list: ListType) => {
    setSelectedList(list)
    setShowConfirmation(true)
  }

  const handleConfirmSelection = async () => {
    if (!selectedList || !roundId) return
    
    try {
      // Update the round with the selected list
      const { error } = await supabase
        .from('game_rounds')
        .update({
          list_id: selectedList.id
        })
        .eq('id', roundId)
      
      if (error) throw error
      
      // Navigate to the game play page
      router.push(`/game/play/${selectedList.id}?roundId=${roundId}`)
    } catch (error) {
      console.error('Error updating round:', error)
      // For development, proceed anyway
      router.push(`/game/play/${selectedList.id}?roundId=${roundId}`)
    }
  }

  const handleBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false)
      setSelectedList(null)
    } else if (showLists) {
      setShowLists(false)
    }
  }

  // If not the judge, show a waiting screen
  // if (!isJudge) {
  //   return (
  //     <div className="min-h-screen bg-new-blue text-offwhite flex flex-col items-center justify-center p-4">
  //       <div className="text-6xl mb-6">⌛</div>
  //       <h1 className="text-3xl font-bold mb-4 text-center">Waiting for Judge</h1>
  //       <p className="text-center text-white/70 max-w-md">
  //         The judge is currently selecting a category for this round. 
  //         Please wait until they make their selection.
  //       </p>
  //     </div>
  //   )
  // }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-new-blue text-offwhite flex items-center justify-center">
        <div className="text-2xl">Loading categories...</div>
      </div>
    )
  }

  // If no categories available
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-new-blue text-offwhite flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-3xl font-bold mb-4 text-center">No Categories Available</h1>
        <p className="text-center text-white/70 max-w-md">
          There are no categories available. Please contact the administrator.
        </p>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-new-blue text-offwhite flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="p-4 flex justify-between items-center border-b border-white/20">
        <h1 className="text-2xl font-bold font-outfit">Top 10 Game</h1>
        <div className="text-white/70">Judge Mode</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {showConfirmation && selectedList ? (
          // Confirmation screen
          <div className="w-full max-w-lg">
            <div className="flex items-center mb-6">
              <button 
                onClick={handleBack}
                className="mr-4 hover:bg-white/10 p-2 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold">Confirm Selection</h2>
            </div>
            
            <div className="bg-white/10 p-6 rounded-md mb-6">
              <h3 className="text-xl font-semibold mb-2">{selectedList.title}</h3>
              {selectedList.description && (
                <p className="text-white/70 mb-4">{selectedList.description}</p>
              )}
              
              {selectedList.source_url && (
                <div className="mb-4">
                  <div className="flex items-center text-white/70 mb-2">
                    <Info size={16} className="mr-2" />
                    <span className="text-sm">Source Reference</span>
                  </div>
                  <a 
                    href={selectedList.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-300 hover:text-blue-200 text-sm"
                  >
                    <span className="truncate">{selectedList.source_url}</span>
                    <ExternalLink size={14} className="ml-1 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              <div className="mt-6">
                <p className="text-white/70 mb-4">
                  Once you confirm, you'll be able to review the list before starting the game.
                  <strong className="block mt-2">Reminder: Don't show the list to the players!</strong>
                </p>
                <button
                  onClick={handleConfirmSelection}
                  className="w-full py-3 bg-white text-new-blue font-bold rounded-md hover:bg-white/90 transition-colors"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        ) : showLists ? (
          // List selection screen
          <div className="w-full max-w-lg">
            <div className="flex items-center mb-6">
              <button 
                onClick={handleBack}
                className="mr-4 hover:bg-white/10 p-2 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold">{currentCategory?.name} Lists</h2>
            </div>
            
            {lists.length === 0 ? (
              <div className="bg-white/10 p-6 rounded-md text-center">
                <p className="text-white/70">No lists available for this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleSelectList(list)}
                    className="w-full text-left bg-white/10 hover:bg-white/20 p-4 rounded-md transition-all"
                  >
                    <h3 className="text-lg font-semibold">{list.title}</h3>
                    {list.description && (
                      <p className="text-sm text-white/70 mt-1">{list.description}</p>
                    )}
                    {list.source_url && (
                      <div className="flex items-center text-xs text-blue-300 mt-2">
                        <ExternalLink size={12} className="mr-1" />
                        <span className="truncate">Source Available</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Category selection screen
          <div className="text-center w-full max-w-md">
            <div className="text-8xl mb-6">
              {currentCategory?.icon || '🎮'}
            </div>
            <h2 className="text-4xl font-bold mb-8">{currentCategory?.name}</h2>
            
            {currentCategory?.description && (
              <p className="text-white/70 mb-8">{currentCategory.description}</p>
            )}
            
            <button 
              onClick={handleSelectCategory}
              className="w-full bg-white text-new-blue font-bold py-4 px-8 rounded-md text-xl mb-8 hover:bg-white/90 transition-all"
              disabled={loadingLists}
            >
              {loadingLists ? 'Loading...' : 'View Lists'}
            </button>
            
            <div className="flex justify-between items-center">
              <button 
                onClick={handlePreviousCategory} 
                disabled={currentCategoryIndex === 0}
                className={`p-3 rounded-full ${currentCategoryIndex === 0 ? 'text-white/30' : 'text-white hover:bg-white/10'}`}
              >
                <ArrowLeft size={24} />
              </button>
              
              <div className="text-sm">
                {currentCategoryIndex + 1} / {categories.length}
              </div>
              
              <button 
                onClick={handleNextCategory} 
                disabled={currentCategoryIndex === categories.length - 1}
                className={`p-3 rounded-full ${currentCategoryIndex === categories.length - 1 ? 'text-white/30' : 'text-white hover:bg-white/10'}`}
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 