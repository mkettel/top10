// components/ScoresPanel.tsx
import { useState, useEffect } from 'react'
import { Crown, Trophy, ChevronRight, ChevronLeft } from 'lucide-react'
import { Player } from '@/lib/types/game'
import { motion, AnimatePresence } from 'motion/react'

interface ScoresPanelProps {
  players: Player[]
}

export const ScoresPanel = ({ players }: ScoresPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // 768px is typical md breakpoint
    }
    
    // Initial check
    checkIfMobile()
    
    // Set up listener for window resize
    window.addEventListener('resize', checkIfMobile)
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  // Auto-open on desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [isMobile])

  return (
    <div className="relative h-full">
      {/* Overlay when panel is open on mobile */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Toggle button (only on mobile) */}
      {isMobile && (
        <motion.button
          initial={{ opacity: 0.6 }}
          whileHover={{ opacity: 1, scale: 1.01 }}
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-1/3 right-0 w-10 h-28 cursor-pointer bg-yellow-600/80 hover:bg-yellow-600 rounded-l-lg flex items-center justify-center z-20 shadow-lg"
          aria-label={isOpen ? "Close scores panel" : "Open scores panel"}
        >
          <motion.div
            initial={false}
            animate={{ rotate: isOpen ? 10 : 0 }}
            transition={{ duration: 0.3 }}
            className='-rotate-90'
          >
            {/* {isOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />} */}
            Scores
          </motion.div>
        </motion.button>
      )}
      
      {/* Scores Panel */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isMobile && !isOpen ? '100%' : 0,
          opacity: 1
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30
        }}
        className={`${isMobile ? 'fixed top-0 right-0 h-full w-3/4 max-w-xs' : 'h-full w-full'} bg-white/10 backdrop-blur-sm rounded-md shadow-lg p-4 z-20`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Trophy size={20} className="text-yellow-400 mr-2" />
            Player Scores
          </h2>
          {isMobile && (
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {players
            .sort((a, b) => b.score - a.score) // Sort by score descending
            .map((player, index) => (
              <motion.div 
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-md flex justify-between items-center ${
                  index === 0 && player.score > 0 && !player.isJudge 
                    ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-500/10 border border-yellow-500/30' 
                    : player.isJudge 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/20' 
                      : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center">
                  {index === 0 && player.score > 0 && !player.isJudge && (
                    <div className="mr-2 text-yellow-400">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, 0, -5, 0]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 2
                        }}
                      >
                        <Trophy size={16} />
                      </motion.div>
                    </div>
                  )}
                  {player.isJudge && (
                    <div className="mr-2 text-yellow-400">
                      <Crown size={16} />
                    </div>
                  )}
                  <span className="font-medium capitalize">{player.name}</span>
                  {player.isJudge && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">(Judge)</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold">{player.score}</span>
                  <motion.div 
                    initial={false}
                    animate={{ scale: player.score > 0 ? [1, 1.5, 1] : 1 }}
                    transition={{ duration: 0.5 }}
                    className="ml-1 w-1 h-1"
                  />
                </div>
              </motion.div>
            ))
          }
        </div>
      </motion.div>
    </div>
  )
}