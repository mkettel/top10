// private/page.tsx;

'use client'

import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Minus, User2, Crown } from 'lucide-react'
import { PostgrestError, User } from '@supabase/supabase-js'
import { GameGroup, GameRound, PlayerData, DatabasePlayer } from '@/lib/types/game'


export default function PlayerSetupPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [players, setPlayers] = useState<PlayerData[]>([{ name: '', isJudge: false }])
  const [error, setError] = useState<string>('')
  const [groupName, setGroupName] = useState<string>('Game Night')
  const [isCreatingGame, setIsCreatingGame] = useState<boolean>(false)
  
  const supabase = createClient()
  
  // Check authentication on load
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        redirect('/login')
      } else {
        setUser(data.user)
        console.log('User:', data.user)
        setLoading(false)
      }
    }
    
    checkUser()
  }, [])
  
  // Add a new player
  const addPlayer = (): void => {
    setPlayers([...players, { name: '', isJudge: false }])
  }
  
  // Remove a player
  const removePlayer = (index: number): void => {
    if (players.length <= 1) return
    
    const newPlayers = [...players]
    const removedPlayer = newPlayers.splice(index, 1)[0]
    
    // If the removed player was the judge, clear the judge selection
    if (removedPlayer.isJudge) {
      newPlayers.forEach(player => player.isJudge = false)
    }
    
    setPlayers(newPlayers)
  }
  
  // Update player name
  const updatePlayerName = (index: number, name: string): void => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    setPlayers(newPlayers)
  }
  
  // Set judge
  const setJudge = (index: number): void => {
    const newPlayers = [...players]
    // Clear judge selection for all players
    newPlayers.forEach((player, i) => {
      player.isJudge = (i === index)
    })
    setPlayers(newPlayers)
  }
  
  // Validate form
  const validateForm = (): boolean => {
    // Check if all players have names
    if (players.some(player => !player.name.trim())) {
      setError('All players must have names')
      return false
    }
    
    // Check if a judge has been selected
    if (!players.some(player => player.isJudge)) {
      setError('Please select a judge')
      return false
    }
    
    // Check for duplicate names
    const names = players.map(player => player.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      setError('Player names must be unique')
      return false
    }
    
    return true
  }
  
  // Create game and proceed
  const startGame = async (): Promise<void> => {
    if (!validateForm() || !user) return
    
    setIsCreatingGame(true)
    setError('')
    
    try {
      // 1. Create game group
      const { data: groupData, error: groupError } = await supabase
        .from('game_groups')
        .insert({
          name: groupName,
          created_by: user.id
        })
        .select()
        .single()
      
      if (groupError) throw groupError
      
      const gameGroup = groupData as GameGroup
      
      // 2. Add players to database
      const playersData = players.map(player => ({
        group_id: gameGroup.id,
        name: player.name.trim()
      }))
      
      const { data: createdPlayers, error: playersError } = await supabase
        .from('players')
        .insert(playersData)
        .select()
      
      if (playersError) throw playersError
      
      const dbPlayers = createdPlayers as DatabasePlayer[]
      
      // 3. Find judge from player list
      const judgeIndex = players.findIndex(player => player.isJudge)
      const judgePlayer = dbPlayers[judgeIndex]
      
      // 4. Create first game round
      const { data: roundData, error: roundError } = await supabase
        .from('game_rounds')
        .insert({
          group_id: gameGroup.id,
          judge_id: judgePlayer.id,
          round_number: 1,
          status: 'setup'
        })
        .select()
        .single()
      
      if (roundError) throw roundError
      
      const gameRound = roundData as GameRound
      
      // 5. Add players to the round
      const roundPlayersData = dbPlayers.map((player, index) => ({
        round_id: gameRound.id,
        player_id: player.id,
        draft_position: index + 1,
        score: 0
      }))
      
      const { error: roundPlayersError } = await supabase
        .from('round_players')
        .insert(roundPlayersData)
      
      if (roundPlayersError) throw roundPlayersError
      
      // 6. Store game session info in localStorage for state management
      localStorage.setItem('currentGroupId', gameGroup.id)
      localStorage.setItem('currentRoundId', gameRound.id)
      localStorage.setItem('isJudge', (judgePlayer.id === user.id).toString())
      
      // 7. Navigate to category selection
      window.location.href = `/private/categories?roundId=${gameRound.id}`
      // window.location.href = `/private/categories`
    } catch (error) {
      console.error('Error creating game:', error)
      const pgError = error as PostgrestError
      setError(`Failed to create game: ${pgError.message || 'Please try again.'}`)
    } finally {
      setIsCreatingGame(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-new-blue text-offwhite">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-new-blue text-offwhite p-4">
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-4xl font-outfit font-bold mb-8 text-center">Top 10 Game</h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white/10 p-6 rounded-md mb-6">
          <label className="block mb-2 font-medium">Game Name (Optional)</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-md text-white"
            placeholder="Game Night"
          />
        </div>
        
        <div className="bg-white/10 p-6 rounded-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Players</h2>
            <button 
              onClick={addPlayer}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              aria-label="Add player"
              title="Add player"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <p className="text-white/70 mb-6">
            Add all players and select who will be the judge for the first round.
          </p>
          
          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1 flex items-center space-x-2 bg-white/5 rounded-md overflow-hidden">
                  <div className="p-3 bg-white/10">
                    <User2 size={18} />
                  </div>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3"
                    placeholder={`Player ${index + 1}`}
                  />
                </div>
                
                <button
                  onClick={() => setJudge(index)}
                  className={`p-3 rounded-md transition-colors ${
                    player.isJudge 
                      ? 'bg-yellow-500/50 text-yellow-100' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  aria-label={player.isJudge ? "Current judge" : "Make judge"}
                  title={player.isJudge ? "Current judge" : "Make judge"}
                >
                  <Crown size={18} />
                </button>
                
                <button
                  onClick={() => removePlayer(index)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                  disabled={players.length <= 1}
                  aria-label="Remove player"
                  title="Remove player"
                >
                  <Minus size={18} />
                </button>
              </div>
            ))}
          </div>
          
          {players.length < 3 && (
            <p className="text-yellow-300 mt-4 text-sm">
              You need at least 3 players to start a game.
            </p>
          )}
        </div>
        
        <button
          onClick={startGame}
          disabled={isCreatingGame || players.length < 3}
          className={`w-full py-4 rounded-md font-bold text-xl transition-colors ${
            isCreatingGame || players.length < 3
              ? 'bg-white/30 cursor-not-allowed'
              : 'bg-white text-new-blue hover:bg-white/90'
          }`}
        >
          {isCreatingGame ? 'Creating Game...' : 'Start Game'}
        </button>
      </div>

      {/* Link to Simple mode /private/simple */}
      <div className="max-w-md mx-auto mt-8 pb-6">
        <p className="text-center text-white/70 mb-4">
          Want to play a quick game? Try the simple mode!
        </p>
        <a 
          href="/private/simple"
          className="block w-full py-4 bg-white/10 text-white text-center font-semibold rounded-lg hover:bg-white/20 transition-colors"
        >
          Simple Mode
        </a>
      </div>
    </div>
  )
}