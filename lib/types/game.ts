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