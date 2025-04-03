// Types for our application
export interface PlayerData {
  name: string
  isJudge: boolean
}

export interface DatabasePlayer {
  id: string
  group_id: string
  name: string
  total_wins: number
  created_at: string
}

export interface GameGroup {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface GameRound {
  id: string
  group_id: string
  judge_id: string
  round_number: number
  status: 'setup' | 'in_progress' | 'completed' | 'playing'
  created_at: string
}

export interface ListItem {
  id: string
  rank: number
  name: string
  details?: string
  statistic?: string
}

export interface Player {
  id: string
  name: string
  score: number
  draftPosition: number
  isJudge?: boolean
}

export interface GuessedItem {
  playerId: string
  playerName: string
  itemId: string
  itemName: string
  itemRank: number
}

export interface ListData {
  id: string
  title: string
  description?: string
  source_url?: string
}