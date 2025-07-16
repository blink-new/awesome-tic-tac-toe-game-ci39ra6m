import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'
import { 
  RotateCcw, 
  User, 
  Bot, 
  Trophy, 
  Zap,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

type Player = 'X' | 'O' | null
type GameMode = 'pvp' | 'pvc'
type Difficulty = 'easy' | 'medium' | 'hard'

interface GameState {
  board: Player[]
  currentPlayer: Player
  winner: Player | 'tie' | null
  winningLine: number[] | null
  gameMode: GameMode
  difficulty: Difficulty
  scores: {
    X: number
    O: number
    ties: number
  }
}

const initialState: GameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  winner: null,
  winningLine: null,
  gameMode: 'pvp',
  difficulty: 'medium',
  scores: {
    X: 0,
    O: 0,
    ties: 0
  }
}

const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6] // diagonals
]

function App() {
  const [gameState, setGameState] = useState<GameState>(initialState)

  const checkWinner = (board: Player[]): { winner: Player | 'tie' | null, winningLine: number[] | null } => {
    // Check for winning combinations
    for (const combination of winningCombinations) {
      const [a, b, c] = combination
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], winningLine: combination }
      }
    }

    // Check for tie
    if (board.every(cell => cell !== null)) {
      return { winner: 'tie', winningLine: null }
    }

    return { winner: null, winningLine: null }
  }

  const getAvailableMoves = (board: Player[]): number[] => {
    return board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1)
  }

  const minimax = useCallback((board: Player[], depth: number, isMaximizing: boolean, alpha: number = -Infinity, beta: number = Infinity): number => {
    const { winner } = checkWinner(board)
    
    if (winner === 'O') return 10 - depth
    if (winner === 'X') return depth - 10
    if (winner === 'tie') return 0

    const availableMoves = getAvailableMoves(board)
    
    if (isMaximizing) {
      let maxEval = -Infinity
      for (const move of availableMoves) {
        board[move] = 'O'
        const evaluation = minimax(board, depth + 1, false, alpha, beta)
        board[move] = null
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)
        if (beta <= alpha) break
      }
      return maxEval
    } else {
      let minEval = Infinity
      for (const move of availableMoves) {
        board[move] = 'X'
        const evaluation = minimax(board, depth + 1, true, alpha, beta)
        board[move] = null
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)
        if (beta <= alpha) break
      }
      return minEval
    }
  }, [])

  const getBestMove = useCallback((board: Player[], difficulty: Difficulty): number => {
    const availableMoves = getAvailableMoves(board)
    
    if (difficulty === 'easy') {
      // 70% random, 30% optimal
      if (Math.random() < 0.7) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)]
      }
    } else if (difficulty === 'medium') {
      // 30% random, 70% optimal
      if (Math.random() < 0.3) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)]
      }
    }
    
    // Hard difficulty or fallback to optimal play
    let bestMove = availableMoves[0]
    let bestValue = -Infinity
    
    for (const move of availableMoves) {
      board[move] = 'O'
      const moveValue = minimax(board, 0, false)
      board[move] = null
      
      if (moveValue > bestValue) {
        bestValue = moveValue
        bestMove = move
      }
    }
    
    return bestMove
  }, [minimax])

  const makeMove = useCallback((index: number) => {
    if (gameState.board[index] || gameState.winner) return

    const newBoard = [...gameState.board]
    newBoard[index] = gameState.currentPlayer

    const { winner, winningLine } = checkWinner(newBoard)
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X',
      winner,
      winningLine,
      scores: winner ? {
        ...prev.scores,
        [winner === 'tie' ? 'ties' : winner]: prev.scores[winner === 'tie' ? 'ties' : winner] + 1
      } : prev.scores
    }))

    if (winner) {
      if (winner === 'tie') {
        toast('It\'s a tie! 🤝', { icon: '🎯' })
      } else {
        const isPlayerWin = winner === 'X' || (gameState.gameMode === 'pvp' && winner === 'O')
        toast(isPlayerWin ? `Player ${winner} wins! 🎉` : 'Computer wins! 🤖', { 
          icon: isPlayerWin ? '🏆' : '🤖' 
        })
      }
    }
  }, [gameState.board, gameState.winner, gameState.currentPlayer, gameState.gameMode])

  // Computer move effect
  useEffect(() => {
    if (gameState.gameMode === 'pvc' && gameState.currentPlayer === 'O' && !gameState.winner) {
      const timer = setTimeout(() => {
        const bestMove = getBestMove([...gameState.board], gameState.difficulty)
        makeMove(bestMove)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [gameState.currentPlayer, gameState.gameMode, gameState.board, gameState.winner, gameState.difficulty, getBestMove, makeMove])

  const resetGame = () => {
    setGameState(prev => ({
      ...initialState,
      gameMode: prev.gameMode,
      difficulty: prev.difficulty,
      scores: prev.scores
    }))
  }

  const resetScores = () => {
    setGameState(prev => ({
      ...prev,
      scores: { X: 0, O: 0, ties: 0 }
    }))
    toast.success('Scores reset!')
  }

  const setGameMode = (mode: GameMode) => {
    setGameState(prev => ({
      ...initialState,
      gameMode: mode,
      difficulty: prev.difficulty,
      scores: prev.scores
    }))
  }

  const setDifficulty = (diff: Difficulty) => {
    setGameState(prev => ({
      ...prev,
      difficulty: diff
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Tic Tac Toe
          </h1>
          <p className="text-muted-foreground text-lg">
            Challenge yourself or play with a friend
          </p>
        </motion.div>

        {/* Game Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Game Settings
              </h3>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={gameState.gameMode === 'pvp' ? 'default' : 'outline'}
                  onClick={() => setGameMode('pvp')}
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Player vs Player
                </Button>
                <Button
                  variant={gameState.gameMode === 'pvc' ? 'default' : 'outline'}
                  onClick={() => setGameMode('pvc')}
                  className="flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" />
                  vs Computer
                </Button>
              </div>

              {gameState.gameMode === 'pvc' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <p className="text-sm text-muted-foreground">Difficulty:</p>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <Button
                        key={diff}
                        size="sm"
                        variant={gameState.difficulty === diff ? 'default' : 'outline'}
                        onClick={() => setDifficulty(diff)}
                        className="capitalize"
                      >
                        {diff === 'easy' && '😊'}
                        {diff === 'medium' && '🤔'}
                        {diff === 'hard' && '😤'}
                        {' '}{diff}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Score Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Trophy className="w-5 h-5 text-accent" />
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {gameState.scores.X}
                    </div>
                    <div className="text-sm text-muted-foreground">Player X</div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {gameState.scores.O}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {gameState.gameMode === 'pvp' ? 'Player O' : 'Computer'}
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {gameState.scores.ties}
                    </div>
                    <div className="text-sm text-muted-foreground">Ties</div>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetScores}
                className="text-xs"
              >
                Reset Scores
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Game Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <AnimatePresence mode="wait">
            {gameState.winner ? (
              <motion.div
                key="winner"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="celebration"
              >
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {gameState.winner === 'tie' ? (
                    <>🤝 It's a tie!</>
                  ) : (
                    <>🏆 {gameState.winner === 'X' ? 'Player X' : 
                      (gameState.gameMode === 'pvp' ? 'Player O' : 'Computer')} wins!</>
                  )}
                </Badge>
              </motion.div>
            ) : (
              <motion.div
                key="current-player"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Zap className="w-4 h-4 mr-2" />
                  {gameState.currentPlayer === 'X' ? 'Player X' : 
                    (gameState.gameMode === 'pvp' ? 'Player O' : 'Computer')} turn
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Game Board */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <div className="grid grid-cols-3 gap-3 p-6 glass-card rounded-3xl">
            {gameState.board.map((cell, index) => (
              <motion.button
                key={index}
                className={`game-cell ${
                  gameState.winningLine?.includes(index) ? 'winner-cell' : ''
                }`}
                onClick={() => makeMove(index)}
                disabled={!!cell || !!gameState.winner || 
                  (gameState.gameMode === 'pvc' && gameState.currentPlayer === 'O')}
                whileHover={{ scale: cell || gameState.winner ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                      className={cell === 'X' ? 'player-x' : 'player-o'}
                    >
                      {cell}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Reset Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          <Button
            onClick={resetGame}
            size="lg"
            className="flex items-center gap-2 px-8"
          >
            <RotateCcw className="w-5 h-5" />
            New Game
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

export default App