// private/play/[listId]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { use } from 'react'
import { Crown } from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Info, 
  Award, 
  ExternalLink,
  Check,
  Trophy,
  RefreshCw
} from 'lucide-react'
import { ListData, ListItem, Player, GuessedItem } from '@/lib/types/game'
import { ScoresPanel } from '@/components/ScoresPanel'



export default function GamePlayPage({ params }: { params: { listId: string } }) {
  const { listId } = use(params)
  // const listId = params.listId
  const router = useRouter()
  const supabase = createClient()
  
  // Game state
  const [list, setList] = useState<ListData | null>(null)
  const [listItems, setListItems] = useState<ListItem[]>([])
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'completed' | 'in_progress'>('setup')
  const [players, setPlayers] = useState<Player[]>([])
  const [draftType, setDraftType] = useState<'serpentine' | 'fixed'>('serpentine')
  const [showList, setShowList] = useState(true)
  const [guessedItems, setGuessedItems] = useState<GuessedItem[]>([])
  const [roundId, setRoundId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // UI state
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null)
  const [showPlayerSelection, setShowPlayerSelection] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {})
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  // Fetch game data
  useEffect(() => {
    const fetchGameData = async () => {
      setIsLoading(true)
      
      try {
        // Get round ID from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search)
        const roundIdFromUrl = urlParams.get('roundId')
        const storedRoundId = localStorage.getItem('currentRoundId')
        const currentRoundId = roundIdFromUrl || storedRoundId

        console.log('currentRoundId:', currentRoundId)
        console.log('params', urlParams)
        
        if (currentRoundId) {
          setRoundId(currentRoundId)
          
          // Fetch round data
          const { data: roundData, error: roundError } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('id', currentRoundId)
            .single()
          
          if (roundError) throw roundError
          
          setDraftType(roundData.draft_type || 'serpentine')
          setGamePhase(roundData.status || 'setup')
          
          // Fetch players for this round
          const { data: playersData, error: playersError } = await supabase
            .from('round_players')
            .select('*, player:player_id(*)')
            .eq('round_id', currentRoundId)
            .order('draft_position', { ascending: true })
          
          if (playersError) throw playersError
          
          if (playersData) {
            setPlayers(playersData.map(rp => ({
              id: rp.player_id,
              name: rp.player.name,
              score: rp.score || 0,
              draftPosition: rp.draft_position
            })))
          }

          // Find and mark the judge
          if (roundData && playersData) {
            const judgeId = roundData.judge_id;
            setPlayers(playersData.map(rp => ({
              id: rp.player_id,
              name: rp.player.name,
              score: rp.score || 0,
              draftPosition: rp.draft_position,
              isJudge: rp.player_id === judgeId  // Set isJudge flag
            })));
          }
          
          // Fetch guessed items
          const { data: guessesData, error: guessesError } = await supabase
            .from('guesses')
            .select('*, player:player_id(*), list_item:list_item_id(*)')
            .eq('round_id', currentRoundId)
            .eq('is_correct', true)
          
          if (guessesError) throw guessesError
          
          if (guessesData) {
            setGuessedItems(guessesData.map(guess => ({
              playerId: guess.player_id,
              playerName: guess.player.name,
              itemId: guess.list_item_id,
              itemName: guess.list_item.name,
              itemRank: guess.list_item.rank
            })))
          }
        }
        
        // Fetch list data
        const { data: listData, error: listError } = await supabase
          .from('lists')
          .select('*')
          .eq('id', listId)
          .single()
        
        if (listError) throw listError
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('list_items')
          .select('*')
          .eq('list_id', listId)
          .order('rank', { ascending: true })
        
        if (itemsError) throw itemsError
        
        setList(listData)
        setListItems(itemsData)
      } catch (error) {
        console.error('Error fetching game data:', error)
        
        // If we don't have players, use mock players for development
        if (players.length === 0) {
          setPlayers([
            { id: '1', name: 'Player 1', score: 0, draftPosition: 1 },
            { id: '2', name: 'Player 2', score: 0, draftPosition: 2 },
            { id: '3', name: 'Player 3', score: 0, draftPosition: 3 }
          ])
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGameData()
  }, [listId, supabase])


  // Start the game
  const startGame = async () => {
    try {
      if (roundId) {
        // Update the round in Supabase
        const { error } = await supabase
          .from('game_rounds')
          .update({
            list_id: listId,
            draft_type: draftType,
            status: 'in_progress'
          })
          .eq('id', roundId)
        
        if (error) throw error
      }
      
      setGamePhase('playing')
    } catch (error) {
      console.error('Error starting game:', error)
      // Proceed anyway for development
      setGamePhase('playing')
    }
  }

  useEffect(() => {
    console.log('gamePhase:', gamePhase)
    if (gamePhase === 'in_progress') {
      // Start the game
      setGamePhase('playing')
    }
  }, [gamePhase])

  // Handle item click (when judge selects an item)
  const handleItemClick = (item: ListItem) => {
    // If game is not in playing phase or item is already guessed, do nothing
    if (gamePhase !== 'playing' || 
        guessedItems.some(guessedItem => guessedItem.itemId === item.id)) {
      return
    }
    
    setSelectedItem(item)
    setShowPlayerSelection(true)
  }

  // Assign correct guess to player
  const assignGuessToPlayer = async (playerId: string) => {
    if (!selectedItem) return
    
    const player = players.find(p => p.id === playerId)
    if (!player) return
    
    // Add to guessed items
    const newGuessedItem = {
      playerId,
      playerName: player.name,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemRank: selectedItem.rank
    }
    
    setGuessedItems([...guessedItems, newGuessedItem])
    
    // Update player score
    const updatedPlayers = players.map(p => {
      if (p.id === playerId && !p.isJudge) {
        return { ...p, score: p.score + 1 }
      }
      return p
    })
    
    setPlayers(updatedPlayers)
    
    // Save to Supabase if we have a round ID
    if (roundId) {
      // Record the guess
      supabase
        .from('guesses')
        .insert({
          round_id: roundId,
          player_id: playerId,
          list_item_id: selectedItem.id,
          is_correct: true
        })
        .then(({ error }) => {
          if (error) console.error('Error recording guess:', error)
        })
      
      // Update player score - only if they are not the judge
      if (!player.isJudge) {
        supabase
          .from('round_players')
          .update({ score: player.score + 1 })
          .eq('round_id', roundId)
          .eq('player_id', playerId)
          .then(({ error }) => {
            if (error) console.error('Error updating player score:', error)
          })
      }
    }
    
    // Reset selection state
    setSelectedItem(null)
    setShowPlayerSelection(false)
    
    // Check if game is complete
    if (guessedItems.length + 1 === listItems.length || guessedItems.length + 1 === 10) {
      completeGame(updatedPlayers)
    }
  }

  // Complete the game
  const completeGame = async (finalPlayers = players) => {
    // Find the winner(s)
    const highestScore = Math.max(...finalPlayers.map(p => p.score))
    const winners = finalPlayers.filter(p => p.score === highestScore)
    
    try {
      if (roundId) {
        // Update the round status in Supabase
        const { error } = await supabase
          .from('game_rounds')
          .update({
            status: 'completed',
            winner_id: winners.length === 1 ? winners[0].id : null
          })
          .eq('id', roundId)
        
        if (error) throw error
        
        // If there's a single winner, update their win count
        if (winners.length === 1) {
          const { error: winnerError } = await supabase
            .from('players')
            .update({
              total_wins: supabase.rpc('increment', { x: 1 })
            })
            .eq('id', winners[0].id)
          
          if (winnerError) console.error('Error updating winner stats:', winnerError)
        }
      }
      
      setGamePhase('completed')
    } catch (error) {
      console.error('Error completing game:', error)
      // Proceed anyway for development
      setGamePhase('completed')
    }
  }

  // Start a new round with a new judge
  const startNewRound = () => {
    setConfirmationMessage('Start a new round with the next judge?')
    setConfirmationAction(() => async () => {
      try {
        if (roundId) {
          // Find the current judge
          const { data: currentRound, error: roundError } = await supabase
            .from('game_rounds')
            .select('judge_id, round_number, group_id')
            .eq('id', roundId)
            .single()
          
          if (roundError) throw roundError
          
          // Get player index
          const currentJudgeIndex = players.findIndex(p => p.id === currentRound.judge_id)
          
          // Determine the next judge (cycle through players)
          const nextJudgeIndex = (currentJudgeIndex + 1) % players.length
          const nextJudge = players[nextJudgeIndex]
          
          // Create a new round
          const { data: newRound, error } = await supabase
            .from('game_rounds')
            .insert({
              group_id: currentRound.group_id,
              judge_id: nextJudge.id,
              round_number: currentRound.round_number + 1,
              status: 'setup'
            })
            .select()
            .single()
          
          if (error) throw error
          
          // Add all players to the new round
          const roundPlayersData = players.map((player, i) => ({
            round_id: newRound.id,
            player_id: player.id,
            draft_position: i + 1,
            score: 0
          }))
          
          const { error: playersError } = await supabase
            .from('round_players')
            .insert(roundPlayersData)
          
          if (playersError) throw playersError
          
          // Update local storage
          localStorage.setItem('currentRoundId', newRound.id)
          
          // Navigate to the category selection
          router.push(`/private/categories?roundId=${newRound.id}`)
        } else {
          // Fallback for development without Supabase
          router.push('/private/categories')
        }
      } catch (error) {
        console.error('Error starting new round:', error)
        // Fallback for errors
        router.push('/private/categories')
      }
    })
    setShowConfirmation(true)
  }

  // Cancel confirmation
  const cancelConfirmation = () => {
    setShowConfirmation(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-new-blue text-offwhite flex items-center justify-center">
        <div className="text-2xl">Loading game...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-new-blue text-offwhite flex flex-col">
      {/* Header */}
      <header className="p-4 flex gap-1 justify-between items-center border-b border-white/20">
        <div className="flex w-full items-center">
          <button 
            onClick={() => router.push('/private/categories')}
            className="hover:bg-white/10 p-2 rounded-full cursor-pointer"
            >
            <ArrowLeft size={20} />
          </button>
          <p>Back to Categories</p>
          </div>
        <div className="flex w-full justify-end items-center">
          {/* Judge indicator */}
          <div className="mr-3 text-sm bg-yellow-500/30 text-yellow-100 px-3 py-1 rounded-full flex items-center">
            <Crown size={14} className="mr-1" />
            Judge: {players.find(p => p.isJudge)?.name || 'Unknown'}
          </div>
          {/* <button 
            onClick={() => setShowList(!showList)}
            className="hover:bg-white/10 p-2 rounded-full cursor-pointer"
          >
            {showList ? <EyeOff size={20} /> : <Eye size={20} />}
          </button> */}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {/* Setup Phase */}
        {gamePhase === 'setup' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 p-4 rounded-md mb-6">
              <h2 className="text-xl font-bold mb-2">Game Setup</h2>
              <p className="text-white/70 mb-4">
                As the Judge, you'll manage the game and decide which answers are correct.
              </p>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Draft Type:</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={draftType === 'serpentine'}
                      onChange={() => setDraftType('serpentine')}
                      className="accent-white cursor-pointer"
                    />
                    <span>Serpentine</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={draftType === 'fixed'}
                      onChange={() => setDraftType('fixed')}
                      className="accent-white cursor-pointer"
                    />
                    <span>Fixed</span>
                  </label>
                </div>
              </div>
              
              {list?.source_url && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Source Reference:</h3>
                  <a 
                    href={list.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 text-sm flex items-center"
                  >
                    <span className="truncate">{list.source_url}</span>
                    <ExternalLink size={14} className="ml-1 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">List Preview:</h3>
                  <button 
                    onClick={() => setShowList(!showList)}
                    className="text-sm flex items-center text-white/70 hover:text-white cursor-pointer"
                  >
                    {showList ? (
                      <>
                        <EyeOff size={14} className="mr-1" />
                        Hide List
                      </>
                    ) : (
                      <>
                        <Eye size={14} className="mr-1" />
                        Show List
                      </>
                    )}
                  </button>
                </div>
                
                {showList && (
                  <div className="mt-2 bg-white/5 rounded-md p-3">
                    <ol className="list-decimal pl-5 space-y-1">
                      {listItems.map(item => (
                        <li key={item.id} className="text-sm">
                          <span className="font-semibold">{item.name}</span>
                          {item.details && (
                            <span className="text-white/70 ml-1">({item.details})</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Players:</h3>
                <div className="bg-white/5 rounded-md p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {players.map((player, index) => (
                      <div key={index} className="text-sm p-2 bg-white/10 rounded">
                        <span className="font-semibold">{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-3 rounded-md font-bold text-center bg-white text-new-blue hover:bg-white/90 cursor-pointer"
            >
              Start Game
            </button>
          </div>
        )}


        {/* Playing Phase */}
        {gamePhase === 'playing' && (

          <div className="w-full max-w-lg mx-auto md:flex-col flex-wrap md:gap-2 md:max-w-5xl justify-center">
            
            <div className="flex items-center justify-center  mb-4 md:mb-4">
              <h1 className="text-xl md:text-3xl text-center  font-bold">{list?.title}</h1>
            </div>

            {/* Available items - only show when not in player selection mode */}
            <div className="flex gap-2">
            <Tabs defaultValue='list' className='w-full bg-white/10 rounded-md p-1'>
              <TabsList className="grid bg-transparent w-full grid-cols-2">
                <TabsTrigger value="list" className='cursor-pointer'>List</TabsTrigger>
                <TabsTrigger value="Guessed" className='cursor-pointer'>Guessed</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
              {!showPlayerSelection && (
                <div className="bg-white/10 p-2 rounded-md mb-0 md:mb-0 max-h-full md:max-h-[75vh] md:col-span-1 overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Available Items</h2>
                    <button 
                      onClick={() => setShowList(!showList)}
                      className="text-sm flex items-center text-white/70 hover:text-white cursor-pointer"
                    >
                      {showList ? (
                        <>
                          <EyeOff size={14} className="mr-1" />
                          Hide List
                        </>
                      ) : (
                        <>
                          <Eye size={14} className="mr-1" />
                          Show List
                        </>
                      )}
                    </button>
                  </div>

                  
                    <div className="grid grid-cols-1 gap-2">
                      {listItems.map(item => {
                        const isGuessed = guessedItems.some(guessed => guessed.itemId === item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            disabled={isGuessed}
                            className={`p-3 rounded-md text-left flex items-center ${
                              isGuessed 
                                ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                                : 'bg-white/10 hover:bg-white/20 cursor-pointer'
                            }`}
                          >
                            <div className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-full mr-3">
                              {item.rank}
                            </div>
                            <div>
                              <div className="font-medium">{showList ? item.name : "???"}</div>
                              {item.details && (
                                <div className="text-xs text-white/70">
                                  {showList ? item.details : "????"}
                                </div>
                              )}
                            </div>
                            {isGuessed && (
                              <div className="ml-auto">
                                <Check size={16} className="text-green-400" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                </div>
              )}
              
              {/* Player selection when an item is clicked */}
              {showPlayerSelection && selectedItem && (
                <div className="bg-white/10 p-4 rounded-md mb-4 md:mb-0">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Who Guessed It?</h2>
                    <button 
                      onClick={() => {
                        setSelectedItem(null)
                        setShowPlayerSelection(false)
                      }}
                      className="text-white/70 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="bg-white/5 p-3 rounded-md mb-4">
                    <div className="flex items-center">
                      <div className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-full mr-3">
                        {selectedItem.rank}
                      </div>
                      <div>
                        <div className="font-medium">{selectedItem.name}</div>
                        {selectedItem.details && (
                          <div className="text-xs text-white/70">
                            {selectedItem.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {/* do not show judge */}
                    {players.map(player => (
                      !player.isJudge && (
                        <button
                          key={player.id}
                          onClick={() => assignGuessToPlayer(player.id)}
                          className={`w-full p-3 bg-white/10 hover:bg-white/20 rounded-md flex items-center justify-between cursor-pointer`}
                        >
                          <span className="font-medium capitalize">{player.name}</span>
                          <span className="text-sm text-white/70">Score: {player.score}</span>
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>


            {/* Guessed Items */}
              <TabsContent value="Guessed">
                <div className="bg-white/10 p-4 rounded-md mb-1 md:mb-0 md:col-span-1">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Guessed Items</h2>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {guessedItems.length}/10 Guessed
                    </div>
                  </div>
                  
                  {guessedItems.length > 0 ? (
                    <div className="space-y-2">
                      {guessedItems.map((item) => (
                        <div key={item.itemId} className="flex items-center p-2 bg-white/10 rounded-md">
                          <div className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-full mr-3">
                            {item.itemRank}
                          </div>
                          <div>
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-xs text-white/70">
                              Guessed by {item.playerName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/50 text-center py-4">
                      No items guessed yet
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Player scores */}
            <div className={`md:w-full ${isMobile ? 'fixed top-16 right-0 h-[calc(100vh-64px)] z-20' : ''}`}>
              <ScoresPanel players={players} />
            </div>
            </div>


          </div>
        )}

        {/* Completed Phase */}
        {gamePhase === 'completed' && (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white/10 p-6 rounded-md mb-6 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold mb-6">Game Complete!</h2>
              
              {/* Winner section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Winner</h3>
                {players.length > 0 ? (
                  <div>
                    {/* Find highest score */}
                    {(() => {
                      const highestScore = Math.max(...players.map(p => p.score))
                      const winners = players.filter(p => p.score === highestScore)
                      
                      if (winners.length === 1) {
                        return (
                          <div className="bg-yellow-500/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-300">{winners[0].name}</div>
                            <div className="text-white/70">Score: {winners[0].score} points</div>
                          </div>
                        )
                      } else {
                        return (
                          <div className="bg-yellow-500/20 p-4 rounded-lg">
                            <div className="text-xl font-bold text-yellow-300">Tie!</div>
                            <div className="text-white/70 mb-2">Score: {highestScore} points</div>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {winners.map(winner => (
                                <div key={winner.id} className="bg-white/10 px-3 py-1 rounded-full">
                                  {winner.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </div>
                ) : (
                  <div className="text-white/50">No players found</div>
                )}
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={startNewRound}
                  className="w-full py-3 bg-white text-new-blue font-bold rounded-md hover:bg-white/90 cursor-pointer flex items-center justify-center"
                >
                  <RefreshCw size={18} className="mr-2" />
                  Start New Round
                </button>
                <button
                  onClick={() => router.push('/private')}
                  className="w-full py-3 bg-white/10 text-white font-bold rounded-md hover:bg-white/20 cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            </div>
            
            {/* Final scores */}
            <div className="bg-white/10 p-4 rounded-md">
              <h2 className="text-xl font-bold mb-4">Final Scores</h2>
              <div className="grid grid-cols-1 gap-2">
                {players
                  .sort((a, b) => b.score - a.score) // Sort by score descending
                  .map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`p-3 rounded-md flex justify-between items-center ${
                        index === 0 ? 'bg-yellow-500/20' : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center">
                        {index === 0 && (
                          <Trophy size={16} className="text-yellow-400 mr-2" />
                        )}
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <span className="text-lg font-bold">{player.score}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-new-blue border border-white/20 rounded-lg max-w-sm w-full p-6">
            <h3 className="text-xl font-bold mb-4">{confirmationMessage}</h3>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelConfirmation}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  confirmationAction()
                }}
                className="flex-1 py-2 bg-white text-new-blue hover:bg-white/90 font-bold rounded-md cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}