"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, GitGraph, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Tree node types
interface TreeNode {
  id: string;
  value: number | null;
  isMaximizer: boolean;
  children: TreeNode[];
  pruned: boolean;
  alpha: number;
  beta: number;
  depth: number;
  evaluated: boolean;
  bestChild?: TreeNode | null;
  x?: number;
  y?: number;
  width?: number;
}

// Game state for Tic-Tac-Toe
type GameState = ('X' | 'O' | null)[];
type Player = 'X' | 'O';

const MinimaxVisualization: React.FC = () => {
  // Canvas for tree visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game and algorithm state
  const [gameState, setGameState] = useState<GameState>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  
  // Visualization state
  const [isRunning, setIsRunning] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [alphaBetaPruning, setAlphaBetaPruning] = useState(true);
  const [maxDepth, setMaxDepth] = useState(3);
  const [showNodeValues, setShowNodeValues] = useState(true);
  const [showAlphaBeta, setShowAlphaBeta] = useState(true);
  
  // Animation state
  const [gameTree, setGameTree] = useState<TreeNode | null>(null);
  const [evaluationSteps, setEvaluationSteps] = useState<TreeNode[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  
  // Stats
  const [nodesEvaluated, setNodesEvaluated] = useState(0);
  const [nodesPruned, setNodesPruned] = useState(0);
  
  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Reset game
  const resetGame = () => {
    setGameState(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setGameOver(false);
    setIsRunning(false);
    setGameTree(null);
    setEvaluationSteps([]);
    setCurrentStepIndex(0);
    setNodesEvaluated(0);
    setNodesPruned(0);
  };
  
  // Check for winner
  const checkWinner = (state: GameState): Player | 'Draw' | null => {
    // Check rows
    for (let i = 0; i < 9; i += 3) {
      if (state[i] && state[i] === state[i + 1] && state[i] === state[i + 2]) {
        return state[i] as Player;
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (state[i] && state[i] === state[i + 3] && state[i] === state[i + 6]) {
        return state[i] as Player;
      }
    }
    
    // Check diagonals
    if (state[0] && state[0] === state[4] && state[0] === state[8]) {
      return state[0] as Player;
    }
    
    if (state[2] && state[2] === state[4] && state[2] === state[6]) {
      return state[2] as Player;
    }
    
    // Check for draw
    if (state.every(cell => cell !== null)) {
      return 'Draw';
    }
    
    return null;
  };
  
  // Utility function to evaluate a game state
  const evaluateState = (state: GameState): number => {
    const winner = checkWinner(state);
    
    if (winner === 'X') return 10;
    if (winner === 'O') return -10;
    if (winner === 'Draw') return 0;
    
    // For non-terminal states, we can add heuristic evaluation
    // For simplicity, we'll just return 0 for now
    return 0;
  };
  
  // Generate all possible moves for a given state
  const generateMoves = (state: GameState, player: Player): { state: GameState; move: number }[] => {
    const moves: { state: GameState; move: number }[] = [];
    
    for (let i = 0; i < state.length; i++) {
      if (state[i] === null) {
        const newState = [...state];
        newState[i] = player;
        moves.push({ state: newState, move: i });
      }
    }
    
    return moves;
  };
  
  // Generate the full game tree for visualization
  const generateGameTree = (
    state: GameState, 
    isMaximizer: boolean, 
    depth: number, 
    maxDepth: number,
    alpha: number = -Infinity,
    beta: number = Infinity,
    nodeId: string = '0'
  ): TreeNode => {
    // Create the current node
    const node: TreeNode = {
      id: nodeId,
      value: null,
      isMaximizer,
      children: [],
      pruned: false,
      alpha,
      beta,
      depth,
      evaluated: false
    };
    
    // Check if this is a terminal state or max depth reached
    const winner = checkWinner(state);
    
    if (winner || depth >= maxDepth) {
      node.value = evaluateState(state);
      node.evaluated = true;
      return node;
    }
    
    // Generate possible moves
    const player = isMaximizer ? 'X' : 'O';
    const moves = generateMoves(state, player);
    
    // Create child nodes for each move
    for (let i = 0; i < moves.length; i++) {
      const { state: newState } = moves[i];
      const childNode = generateGameTree(
        newState, 
        !isMaximizer, 
        depth + 1, 
        maxDepth,
        alpha, 
        beta,
        `${nodeId}-${i}`
      );
      
      node.children.push(childNode);
      
      // Update alpha-beta values (but don't prune yet, for visualization)
      if (isMaximizer) {
        if (childNode.value !== null) {
          alpha = Math.max(alpha, childNode.value);
        }
      } else {
        if (childNode.value !== null) {
          beta = Math.min(beta, childNode.value);
        }
      }
      
      node.alpha = alpha;
      node.beta = beta;
    }
    
    return node;
  };
  
  // Create a list of evaluation steps for animation
  const createEvaluationSteps = (node: TreeNode): TreeNode[] => {
    const steps: TreeNode[] = [];
    const visitPostOrder = (node: TreeNode) => {
      // Visit children first
      for (let child of node.children) {
        visitPostOrder(child);
      }
      
      // Then add this node
      const nodeCopy = { ...node };
      steps.push(nodeCopy);
      
      // Apply minimax with alpha-beta pruning
      if (node.children.length > 0) {
        let bestValue = node.isMaximizer ? -Infinity : Infinity;
        let bestChild: TreeNode | null = null;
        let alpha = node.alpha;
        let beta = node.beta;
        let pruneAfter: number | null = null;
        
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child.value === null) continue;
          
          if (node.isMaximizer) {
            if (child.value > bestValue) {
              bestValue = child.value;
              bestChild = child;
            }
            alpha = Math.max(alpha, bestValue);
            
            // Check for pruning if alpha-beta is enabled
            if (alphaBetaPruning && alpha >= beta) {
              pruneAfter = i;
              break;
            }
          } else {
            if (child.value < bestValue) {
              bestValue = child.value;
              bestChild = child;
            }
            beta = Math.min(beta, bestValue);
            
            // Check for pruning if alpha-beta is enabled
            if (alphaBetaPruning && alpha >= beta) {
              pruneAfter = i;
              break;
            }
          }
        }
        
        // Mark remaining children as pruned
        if (pruneAfter !== null) {
          for (let i = pruneAfter + 1; i < node.children.length; i++) {
            node.children[i].pruned = true;
          }
        }
        
        node.value = bestValue;
        node.bestChild = bestChild;
        node.evaluated = true;
      }
    };
    
    // Starting from a deep copy to avoid modifying original tree
    const treeCopy = JSON.parse(JSON.stringify(node));
    visitPostOrder(treeCopy);
    
    // Count stats
    const countStats = (node: TreeNode) => {
      let evaluated = 0;
      let pruned = 0;
      
      if (node.evaluated) evaluated++;
      if (node.pruned) pruned++;
      
      for (const child of node.children) {
        const [childEval, childPruned] = countStats(child);
        evaluated += childEval;
        pruned += childPruned;
      }
      
      return [evaluated, pruned];
    };
    
    const [evaluated, pruned] = countStats(treeCopy);
    setNodesEvaluated(evaluated);
    setNodesPruned(pruned);
    
    return steps;
  };
  
  // Handle a player's move
  const handleMove = (index: number) => {
    if (gameState[index] !== null || gameOver || isRunning) return;
    
    const newState = [...gameState];
    newState[index] = currentPlayer;
    setGameState(newState);
    
    // Check for winner after move
    const result = checkWinner(newState);
    if (result) {
      setWinner(result);
      setGameOver(true);
      return;
    }
    
    // Switch player
    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    
    // Generate new game tree if it's computer's turn (O)
    if (currentPlayer === 'X') {
      const tree = generateGameTree(newState, false, 0, maxDepth);
      setGameTree(tree);
      const steps = createEvaluationSteps(tree);
      setEvaluationSteps(steps);
      setCurrentStepIndex(0);
    }
  };
  
  // Computer makes a move
  const computerMove = () => {
    if (!gameTree || gameTree.bestChild === null || gameOver) return;
    
    // Find the move index that corresponds to the best child
    let moveIndex = -1;
    for (let i = 0; i < gameState.length; i++) {
      if (gameState[i] === null) {
        const testState = [...gameState];
        testState[i] = 'O';
        
        // Find child node that matches this state
        const childIndex = gameTree.children.findIndex(child => {
          // For simplicity, we can check a few specific positions
          return child === gameTree.bestChild;
        });
        
        if (childIndex !== -1) {
          moveIndex = i;
          break;
        }
      }
    }
    
    if (moveIndex !== -1) {
      const newState = [...gameState];
      newState[moveIndex] = 'O';
      setGameState(newState);
      
      // Check for winner after move
      const result = checkWinner(newState);
      if (result) {
        setWinner(result);
        setGameOver(true);
        return;
      }
      
      // Switch player back to human
      setCurrentPlayer('X');
    }
  };
  
  // Start the animation of minimax evaluation
  const startAnimation = () => {
    if (!gameTree || evaluationSteps.length === 0) {
      // Generate the tree if it doesn't exist
      const tree = generateGameTree(gameState, currentPlayer === 'X', 0, maxDepth);
      setGameTree(tree);
      const steps = createEvaluationSteps(tree);
      setEvaluationSteps(steps);
      setCurrentStepIndex(0);
    }
    
    setIsRunning(true);
  };
  
  // Handle animation steps
  useEffect(() => {
    if (isRunning && evaluationSteps.length > 0 && currentStepIndex < evaluationSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
        
        if (currentStepIndex === evaluationSteps.length - 1) {
          setIsRunning(false);
          // After animation completes, computer makes a move if it's its turn
          if (currentPlayer === 'O' && !gameOver) {
            computerMove();
          }
        }
      }, 1000 - (animationSpeed * 9));
      
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStepIndex, evaluationSteps, animationSpeed]);
  
  // Layout tree for visualization
  const layoutTree = (node: TreeNode, x: number, y: number, width: number, level: number = 0): void => {
    node.x = x;
    node.y = y;
    node.width = width;
    
    if (node.children.length === 0) return;
    
    const childWidth = width / node.children.length;
    let childX = x - width / 2 + childWidth / 2;
    
    for (let child of node.children) {
      layoutTree(child, childX, y + 100, childWidth, level + 1);
      childX += childWidth;
    }
  };
  
  // Draw the game tree on canvas
  const drawGameTree = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const currentStep = currentStepIndex < evaluationSteps.length 
      ? evaluationSteps[currentStepIndex] 
      : gameTree;
      
    if (!currentStep) return;
    
    // Layout the tree
    const rootNode = { ...currentStep };
    layoutTree(rootNode, canvas.width / 2, 50, canvas.width - 100);
    
    // Draw connections first
    const drawConnections = (node: TreeNode) => {
      for (let child of node.children) {
        if (!node.x || !node.y || !child.x || !child.y) continue;
        
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(child.x, child.y);
        
        if (child.pruned) {
          // Red dashed line for pruned connections
          ctx.strokeStyle = 'rgba(255, 50, 50, 0.7)';
          ctx.setLineDash([5, 3]);
        } else if (node.bestChild === child) {
          // Highlight path to best move
          ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else {
          // Regular connection
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Recursively draw child connections
        drawConnections(child);
      }
    };
    
    drawConnections(rootNode);
    
    // Then draw nodes
    const drawNodes = (node: TreeNode) => {
      if (!node.x || !node.y) return;
      
      // Draw the node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      
      if (node.pruned) {
        // Red for pruned nodes
        ctx.fillStyle = 'rgba(200, 50, 50, 0.8)';
      } else if (node.evaluated) {
        // Blue for max nodes, orange for min nodes
        ctx.fillStyle = node.isMaximizer 
          ? 'rgba(66, 133, 244, 0.8)' 
          : 'rgba(251, 188, 5, 0.8)';
      } else {
        // Gray for unevaluated nodes
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
      }
      
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw node value
      if (showNodeValues && node.value !== null) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.value.toString(), node.x, node.y);
      }
      
      // Draw alpha-beta values
      if (showAlphaBeta && node.alpha !== undefined && node.beta !== undefined) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Format to prevent long decimals
        const alphaText = node.alpha === -Infinity ? '-∞' : node.alpha === Infinity ? '∞' : node.alpha;
        const betaText = node.beta === -Infinity ? '-∞' : node.beta === Infinity ? '∞' : node.beta;
        
        ctx.fillText(`α=${alphaText}`, node.x - 20, node.y - 25);
        ctx.fillText(`β=${betaText}`, node.x + 20, node.y - 25);
      }
      
      // Recursively draw child nodes
      for (let child of node.children) {
        drawNodes(child);
      }
    };
    
    drawNodes(rootNode);
  };
  
  // Redraw canvas when needed
  useEffect(() => {
    drawGameTree();
  }, [currentStepIndex, gameTree, showNodeValues, showAlphaBeta]);
  
  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Adjust canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      drawGameTree();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-black/50 backdrop-blur-lg shadow-lg" : ""
      )}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitGraph className="w-8 h-8 text-purple-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text">AlgoViz</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col justify-center pt-20">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text">
            Minimax with Alpha-Beta Pruning
          </h1>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left side: Game board */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Tic-Tac-Toe</h2>
                
                {/* Game status */}
                <div className="mb-4 p-3 rounded-lg glass-card">
                  {winner ? (
                    <div className="text-center font-semibold">
                      {winner === 'Draw' ? 'Game ended in a Draw!' : `Player ${winner} wins!`}
                    </div>
                  ) : (
                    <div className="text-center">
                      Current player: <span className="font-semibold">{currentPlayer}</span>
                      {currentPlayer === 'O' && <span className="ml-2">(Computer)</span>}
                    </div>
                  )}
                </div>
                
                {/* Game board */}
                <div className="aspect-square grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-lg mb-4">
                  {gameState.map((cell, i) => (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-md text-2xl font-bold cursor-pointer transition-all duration-200",
                        cell ? "bg-blue-600" : "bg-white/5 hover:bg-white/10"
                      )}
                      onClick={() => handleMove(i)}
                    >
                      {cell}
                    </div>
                  ))}
                </div>
                
                {/* Game controls */}
                <div className="flex gap-2">
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    New Game
                  </Button>
                  
                  {currentPlayer === 'O' && !gameOver && (
                    <Button
                      onClick={startAnimation}
                      variant="outline"
                      disabled={isRunning}
                      className="flex-1"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Think
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Right side: Algorithm controls and tree visualization */}
              <div className="lg:col-span-3">
                <h2 className="text-xl font-semibold mb-4">Algorithm Visualization</h2>
                
                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span>Alpha-Beta Pruning</span>
                    <Switch
                      checked={alphaBetaPruning}
                      onCheckedChange={setAlphaBetaPruning}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Show Node Values</span>
                    <Switch
                      checked={showNodeValues}
                      onCheckedChange={setShowNodeValues}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Show α-β Values</span>
                    <Switch
                      checked={showAlphaBeta}
                      onCheckedChange={setShowAlphaBeta}
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="mb-1">Search Depth: {maxDepth}</span>
                    <Slider
                      value={[maxDepth]}
                      onValueChange={(value) => setMaxDepth(value[0])}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="glass-card p-3 rounded-lg text-center">
                    <div className="text-sm text-gray-400">Nodes Evaluated</div>
                    <div className="text-xl">{nodesEvaluated}</div>
                  </div>
                  
                  <div className="glass-card p-3 rounded-lg text-center">
                    <div className="text-sm text-gray-400">Nodes Pruned</div>
                    <div className="text-xl">{nodesPruned}</div>
                  </div>
                </div>
                
                {/* Animation controls */}
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    onClick={() => setIsRunning(!isRunning)}
                    variant="outline"
                    disabled={evaluationSteps.length === 0 || currentStepIndex >= evaluationSteps.length}
                  >
                    {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isRunning ? 'Pause' : 'Play'}
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                    variant="outline"
                    disabled={currentStepIndex <= 0 || isRunning}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentStepIndex(prev => Math.min(evaluationSteps.length - 1, prev + 1))}
                    variant="outline"
                    disabled={currentStepIndex >= evaluationSteps.length - 1 || isRunning}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1">
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      min={1}
                      max={100}
                      step={1}
                    />
                  </div>
                  <span className="text-sm whitespace-nowrap">Speed: {animationSpeed}%</span>
                </div>
                
                {/* Tree visualization */}
                <div className="w-full bg-black/30 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                  />
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-sm text-gray-300">Maximizer (X)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                    <span className="text-sm text-gray-300">Minimizer (O)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <span className="text-sm text-gray-300">Pruned Node</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-green-500"></div>
                    <span className="text-sm text-gray-300">Optimal Path</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
            <p className="text-gray-300 mb-4">
              Minimax with Alpha-Beta Pruning is a decision-making algorithm used in two-player games:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>The algorithm builds a game tree from the current state, alternating between maximizer (X) and minimizer (O) levels</li>
              <li>At terminal states or maximum depth, it evaluates the board using a heuristic function</li>
              <li>Values propagate upward: maximizers take the highest child value, minimizers take the lowest</li>
              <li>Alpha-Beta pruning optimizes the search by skipping branches that won't affect the final decision</li>
              <li>Alpha represents the minimum score the maximizer is guaranteed, beta is the maximum score the minimizer is guaranteed</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Visualization Guide</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Blue nodes represent maximizer (X) levels, orange nodes represent minimizer (O) levels</li>
                <li>Red nodes show branches that were pruned by alpha-beta</li>
                <li>The green line shows the optimal path found by the algorithm</li>
                <li>Toggle alpha-beta pruning to see how it reduces the number of nodes evaluated</li>
                <li>Adjust the search depth to see more comprehensive game tree analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimaxVisualization;