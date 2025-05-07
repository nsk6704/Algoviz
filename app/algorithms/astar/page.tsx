"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, GitGraph, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Define the 8-puzzle types
type PuzzleState = number[];
type Move = 'up' | 'down' | 'left' | 'right';
type Node = {
  state: PuzzleState;
  parent: Node | null;
  move: Move | null;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
};

// Priority queue for A* algorithm
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number): void {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  contains(element: T, compareFn: (a: T, b: T) => boolean): boolean {
    return this.items.some(item => compareFn(item.element, element));
  }

  // Update priority if element exists
  update(element: T, newPriority: number, compareFn: (a: T, b: T) => boolean): void {
    const index = this.items.findIndex(item => compareFn(item.element, element));
    if (index !== -1) {
      this.items[index].priority = newPriority;
      this.items.sort((a, b) => a.priority - b.priority);
    }
  }
}

const AStarVisualization: React.FC = () => {
  // Puzzle states
  const [initialState, setInitialState] = useState<PuzzleState>([1, 2, 3, 4, 5, 6, 7, 8, 0]); // 0 represents the empty space
  const [currentState, setCurrentState] = useState<PuzzleState>([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  const [goalState, setGoalState] = useState<PuzzleState>([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  
  // Visualization states
  const [isRunning, setIsRunning] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [isSolving, setIsSolving] = useState(false);
  const [steps, setSteps] = useState<Node[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [nodesExplored, setNodesExplored] = useState(0);
  const [heuristicType, setHeuristicType] = useState<'manhattan' | 'misplaced'>('manhattan');
  const [scrolled, setScrolled] = useState(false);
  
  // UI state
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  
  // Canvas for visualizing search tree
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Initialize with a random puzzle
  useEffect(() => {
    generateRandomPuzzle();
  }, []);
  
  // Generate a random solvable puzzle
  const generateRandomPuzzle = () => {
    // Start with the solved state
    let newState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    
    // Make a series of random valid moves to ensure solvability
    let emptyIndex = 8; // Start with empty at bottom right
    
    // Make a large number of random moves
    for (let i = 0; i < 100; i++) {
      const possibleMoves: number[] = [];
      
      // Check which moves are valid
      if (emptyIndex >= 3) possibleMoves.push(-3); // Up
      if (emptyIndex < 6) possibleMoves.push(3);  // Down
      if (emptyIndex % 3 > 0) possibleMoves.push(-1); // Left
      if (emptyIndex % 3 < 2) possibleMoves.push(1);  // Right
      
      // Choose a random move
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      
      // Swap the empty space with the adjacent tile
      const tileIndex = emptyIndex + move;
      newState[emptyIndex] = newState[tileIndex];
      newState[tileIndex] = 0;
      emptyIndex = tileIndex;
    }
    
    setInitialState([...newState]);
    setCurrentState([...newState]);
    setSteps([]);
    setCurrentStepIndex(0);
    setTotalSteps(0);
    setNodesExplored(0);
  };
  
  // Function to calculate Manhattan distance heuristic
  const manhattanDistance = (state: PuzzleState): number => {
    let distance = 0;
    
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== 0) {
        // Find where this tile should be in the goal state
        const goalIndex = goalState.indexOf(state[i]);
        
        // Calculate row and column for current and goal positions
        const currentRow = Math.floor(i / 3);
        const currentCol = i % 3;
        const goalRow = Math.floor(goalIndex / 3);
        const goalCol = goalIndex % 3;
        
        // Add the Manhattan distance
        distance += Math.abs(currentRow - goalRow) + Math.abs(currentCol - goalCol);
      }
    }
    
    return distance;
  };
  
  // Function to calculate misplaced tiles heuristic
  const misplacedTiles = (state: PuzzleState): number => {
    let count = 0;
    
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== 0 && state[i] !== goalState[i]) {
        count++;
      }
    }
    
    return count;
  };
  
  // Calculate heuristic based on selected type
  const calculateHeuristic = (state: PuzzleState): number => {
    return heuristicType === 'manhattan' ? manhattanDistance(state) : misplacedTiles(state);
  };
  
  // Function to get possible next states from a given state
  const getNextStates = (state: PuzzleState): { state: PuzzleState; move: Move }[] => {
    const result: { state: PuzzleState; move: Move }[] = [];
    const emptyIndex = state.indexOf(0);
    
    // Check up
    if (emptyIndex >= 3) {
      const newState = [...state];
      newState[emptyIndex] = newState[emptyIndex - 3];
      newState[emptyIndex - 3] = 0;
      result.push({ state: newState, move: 'up' });
    }
    
    // Check down
    if (emptyIndex < 6) {
      const newState = [...state];
      newState[emptyIndex] = newState[emptyIndex + 3];
      newState[emptyIndex + 3] = 0;
      result.push({ state: newState, move: 'down' });
    }
    
    // Check left
    if (emptyIndex % 3 > 0) {
      const newState = [...state];
      newState[emptyIndex] = newState[emptyIndex - 1];
      newState[emptyIndex - 1] = 0;
      result.push({ state: newState, move: 'left' });
    }
    
    // Check right
    if (emptyIndex % 3 < 2) {
      const newState = [...state];
      newState[emptyIndex] = newState[emptyIndex + 1];
      newState[emptyIndex + 1] = 0;
      result.push({ state: newState, move: 'right' });
    }
    
    return result;
  };
  
  // Compare two states for equality
  const areStatesEqual = (a: PuzzleState, b: PuzzleState): boolean => {
    return a.every((val, idx) => val === b[idx]);
  };
  
  // Check if a node exists in a list
  const containsState = (list: Set<string>, state: PuzzleState): boolean => {
    return list.has(JSON.stringify(state));
  };
  
  // A* algorithm to solve the puzzle
  const solvePuzzle = async () => {
    if (areStatesEqual(currentState, goalState)) {
      return { success: true, path: [{ state: currentState, parent: null, move: null, g: 0, h: 0, f: 0 }] };
    }
    
    setIsSolving(true);
    setNodesExplored(0);
    
    // Initialize the open and closed sets
    const openQueue = new PriorityQueue<Node>();
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    
    // Create the start node
    const startH = calculateHeuristic(currentState);
    const startNode: Node = {
      state: [...currentState],
      parent: null,
      move: null,
      g: 0,
      h: startH,
      f: startH,
    };
    
    // Add the start node to the open set
    openQueue.enqueue(startNode, startNode.f);
    openSet.add(JSON.stringify(startNode.state));
    
    let exploredCount = 0;
    
    while (!openQueue.isEmpty()) {
      // Get the node with the lowest f score
      const currentNode = openQueue.dequeue()!;
      openSet.delete(JSON.stringify(currentNode.state));
      exploredCount++;
      
      setNodesExplored(exploredCount);
      
      // Check if we've reached the goal
      if (areStatesEqual(currentNode.state, goalState)) {
        // Reconstruct the path
        const path: Node[] = [];
        let current: Node | null = currentNode;
        
        while (current !== null) {
          path.unshift(current);
          current = current.parent;
        }
        
        setIsSolving(false);
        setSteps(path);
        setTotalSteps(path.length - 1);
        return { success: true, path };
      }
      
      // Add to closed set
      closedSet.add(JSON.stringify(currentNode.state));
      
      // Get possible next states
      const nextStates = getNextStates(currentNode.state);
      
      for (const { state, move } of nextStates) {
        // Skip if this state is in the closed set
        if (containsState(closedSet, state)) {
          continue;
        }
        
        // Calculate g, h, and f values
        const g = currentNode.g + 1;
        const h = calculateHeuristic(state);
        const f = g + h;
        
        const newNode: Node = {
          state,
          parent: currentNode,
          move,
          g,
          h,
          f
        };
        
        const stateStr = JSON.stringify(state);
        
        // If it's already in open set with a better score, skip it
        if (containsState(openSet, state)) {
          // We would update the priority if this path is better
          // Implementation depends on your priority queue
          continue;
        }
        
        // Add to open set
        openQueue.enqueue(newNode, f);
        openSet.add(stateStr);
      }
    }
    
    setIsSolving(false);
    return { success: false, path: [] };
  };
  
  // Start the solution animation
  const startAnimation = async () => {
    if (steps.length === 0) {
      const result = await solvePuzzle();
      if (!result.success) {
        alert("No solution found!");
        return;
      }
    }
    
    setIsRunning(true);
  };
  
  // Pause the animation
  const pauseAnimation = () => {
    setIsRunning(false);
  };
  
  // Reset to initial state
  const resetPuzzle = () => {
    setIsRunning(false);
    setCurrentState([...initialState]);
    setCurrentStepIndex(0);
  };
  
  // Handle animation steps
  useEffect(() => {
    if (isRunning && steps.length > 0 && currentStepIndex < steps.length) {
      const timer = setTimeout(() => {
        setCurrentState([...steps[currentStepIndex].state]);
        
        if (currentStepIndex === steps.length - 1) {
          // Don't increment past the last step
          setIsRunning(false);
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }, 1000 - (animationSpeed * 9));
      
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStepIndex, steps, animationSpeed]);
  
  // Handle tile click for manual moves
  const handleTileClick = (index: number) => {
    if (isRunning || isSolving) return;
    
    const emptyIndex = currentState.indexOf(0);
    
    // Check if the clicked tile is adjacent to the empty space
    if (
      (Math.abs(index - emptyIndex) === 1 && Math.floor(index / 3) === Math.floor(emptyIndex / 3)) || // Same row
      Math.abs(index - emptyIndex) === 3 // Same column
    ) {
      const newState = [...currentState];
      newState[emptyIndex] = newState[index];
      newState[index] = 0;
      setCurrentState(newState);
      
      // Reset steps since we made a manual move
      setSteps([]);
      setCurrentStepIndex(0);
      setTotalSteps(0);
    }
  };

  // Swap two tiles for puzzle setup
  const swapTiles = (index1: number, index2: number) => {
    if (isRunning || isSolving) return;
    
    const newState = [...currentState];
    [newState[index1], newState[index2]] = [newState[index2], newState[index1]];
    setCurrentState(newState);
    setInitialState([...newState]);
    
    // Reset steps since we modified the puzzle
    setSteps([]);
    setCurrentStepIndex(0);
    setTotalSteps(0);
  };

  // Handle tile selection for swapping
  const handleTileSelection = (index: number) => {
    if (isRunning || isSolving) return;
    
    if (selectedTile === null) {
      setSelectedTile(index);
    } else {
      if (selectedTile !== index) {
        swapTiles(selectedTile, index);
      }
      setSelectedTile(null);
    }
  };
  
  // Draw the search tree on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw search tree visualization if steps are available
    if (steps.length > 0) {
      // Implement tree visualization here
      // This is a simplified placeholder
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      
      for (let i = 1; i < steps.length; i++) {
        const parentNode = steps[i].parent;
        if (!parentNode) continue;
        
        const parentIndex = steps.findIndex(n => n === parentNode);
        
        // Simple visualization - draw lines between steps
        const x1 = (parentIndex / (steps.length - 1)) * width;
        const y1 = height * 0.5;
        const x2 = (i / (steps.length - 1)) * width;
        const y2 = height * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Highlight current step
        if (i === currentStepIndex) {
          ctx.fillStyle = '#4285F4';
          ctx.beginPath();
          ctx.arc(x2, y2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [steps, currentStepIndex]);
  
  // Function to get color for a tile
  const getTileColor = (value: number, index: number): string => {
    if (value === 0) return 'bg-transparent';
    
    // Highlight if selected for swapping
    if (index === selectedTile) return 'bg-purple-500';
    
    // Highlight if tile is in the correct position
    if (value === goalState[index]) {
      return 'bg-green-500 bg-opacity-40';
    }
    
    return 'bg-blue-600';
  };

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
            A* Algorithm (8-Puzzle) Visualization
          </h1>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl mb-8">
            {/* Controls - Top section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button
                  onClick={isRunning ? pauseAnimation : startAnimation}
                  variant="outline"
                  disabled={isSolving}
                  className="flex-1 sm:flex-none"
                >
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRunning ? 'Pause' : 'Start'}
                </Button>
                
                <Button
                  onClick={resetPuzzle}
                  variant="outline"
                  disabled={isSolving}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                
                <Button
                  onClick={generateRandomPuzzle}
                  variant="outline"
                  disabled={isRunning || isSolving}
                  className="flex-1 sm:flex-none"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Random Puzzle
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[90px]">Speed:</span>
                  <Slider
                    value={[animationSpeed]}
                    onValueChange={(value) => setAnimationSpeed(value[0])}
                    min={1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Heuristic selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="mb-2">Heuristic:</div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setHeuristicType('manhattan')}
                    variant={heuristicType === 'manhattan' ? 'default' : 'outline'}
                    className="flex-1"
                    disabled={isRunning || isSolving}
                  >
                    Manhattan Distance
                  </Button>
                  <Button
                    onClick={() => setHeuristicType('misplaced')}
                    variant={heuristicType === 'misplaced' ? 'default' : 'outline'}
                    className="flex-1"
                    disabled={isRunning || isSolving}
                  >
                    Misplaced Tiles
                  </Button>
                </div>
              </div>
              
              
            </div>
            
            {/* Info section */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-3 rounded-lg text-center">
                <div className="text-sm text-gray-400">Steps</div>
                <div className="text-xl">{currentStepIndex}/{totalSteps}</div>
              </div>
              
              <div className="glass-card p-3 rounded-lg text-center">
                <div className="text-sm text-gray-400">Nodes Explored</div>
                <div className="text-xl">{nodesExplored}</div>
              </div>
              
              <div className="glass-card p-3 rounded-lg text-center col-span-2 sm:col-span-1">
                <div className="text-sm text-gray-400">Current Heuristic</div>
                <div className="text-xl">{calculateHeuristic(currentState)}</div>
              </div>
            </div>
            
            {/* Puzzle Grid */}
            <div className="flex justify-center mb-6">
              <div className="w-full max-w-xs">
                <div className="aspect-square grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-lg relative">
                  {currentState.map((value, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-md relative cursor-pointer transition-all duration-200",
                        getTileColor(value, index),
                        value === 0 ? "pointer-events-none" : "hover:bg-opacity-80",
                        selectedTile === index && "ring-4 ring-purple-500"
                      )}
                      onClick={() => selectedTile !== null ? handleTileSelection(index) : handleTileClick(index)}
                    >
                      {value !== 0 && (
                        <span className="text-2xl font-bold">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-400 mt-2">
                  {selectedTile !== null ? 
                    "Select another tile to swap positions" : 
                    "Click a tile next to the empty space to move it"
                  }
                </div>
              </div>
            </div>
            
            {/* Search Tree Visualization */}
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <h3 className="text-lg font-medium mb-2">Search Tree Visualization</h3>
                <div className="relative bg-black/50 rounded-lg overflow-hidden" style={{ height: '100px' }}>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={100}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
            <p className="text-gray-300 mb-4">
              A* (A-Star) is an informed search algorithm that finds the shortest path from a start state to a goal state:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>It uses a heuristic function to estimate the cost from the current state to the goal</li>
              <li>For each state, it calculates f(n) = g(n) + h(n), where g(n) is the cost so far and h(n) is the heuristic estimate</li>
              <li>States are explored in order of their f-value (lowest first)</li>
              <li>The algorithm is guaranteed to find the optimal solution when using an admissible heuristic</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Move tiles manually by clicking adjacent to the empty space</li>
                <li>Generate random puzzles to test different scenarios</li>
                <li>Toggle between Manhattan distance and Misplaced tiles heuristics</li>
                <li>Watch the algorithm find the optimal solution step by step</li>
                <li>Use setup mode to create custom puzzles by swapping tiles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AStarVisualization;