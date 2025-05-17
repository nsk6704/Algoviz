"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, GitGraph, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Point {
  x: number;
  y: number;
  value: number;
}

interface Solution {
  point: Point;
  trajectory: Point[];
  isComplete: boolean;
  success: boolean; // Whether it found a local maximum
}

const HillClimbVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landscape, setLandscape] = useState<number[][]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [currentStep, setCurrentStep] = useState(0);
  const [landscapeType, setLandscapeType] = useState<'unimodal' | 'multimodal'>('multimodal');
  const [showGradient, setShowGradient] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [numStartPoints, setNumStartPoints] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  const [showContour, setShowContour] = useState(true);
  
  // Base dimensions for the virtual canvas
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 600;
  const LANDSCAPE_RESOLUTION = 80; // Grid size for the function landscape
  
  // Color palette
  const colors = {
    background: '#000000',
    contour: 'rgba(255, 255, 255, 0.1)',
    landscape: [
      'rgb(15, 10, 40)', // Low - dark purple
      'rgb(40, 30, 100)',
      'rgb(80, 20, 120)',
      'rgb(120, 20, 120)',
      'rgb(180, 30, 100)',
      'rgb(220, 50, 40)',
      'rgb(250, 150, 30)',
      'rgb(255, 230, 100)', // High - bright yellow
    ],
    path: 'rgba(255, 255, 255, 0.7)',
    currentPoint: 'rgba(0, 255, 196, 1)',
    startPoint: 'rgba(66, 133, 244, 0.8)',
    endPoint: 'rgba(234, 67, 53, 0.8)',
    maxima: 'rgba(255, 230, 100, 0.8)',
  };
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Generate a landscape function that varies in x and y
  const generateLandscape = () => {
    // Reset state
    setSolutions([]);
    setCurrentStep(0);
    setIsRunning(false);
    
    // Create a grid of height values
    const newLandscape: number[][] = Array(LANDSCAPE_RESOLUTION)
      .fill(0)
      .map(() => Array(LANDSCAPE_RESOLUTION).fill(0));
    
    // For multimodal landscape with multiple local maxima
    if (landscapeType === 'multimodal') {
      // Create several peaks
      const numPeaks = 5 + Math.floor(Math.random() * 5); // 5-9 peaks
      const peaks = [];
      
      for (let i = 0; i < numPeaks; i++) {
        peaks.push({
          x: Math.random() * LANDSCAPE_RESOLUTION,
          y: Math.random() * LANDSCAPE_RESOLUTION,
          height: 0.5 + Math.random() * 0.5, // Height between 0.5 and 1
          width: 5 + Math.random() * 15, // Width between 5 and 20
        });
      }
      
      // Calculate the height at each grid point based on distance to peaks
      for (let x = 0; x < LANDSCAPE_RESOLUTION; x++) {
        for (let y = 0; y < LANDSCAPE_RESOLUTION; y++) {
          let value = 0;
          
          for (const peak of peaks) {
            const dx = x - peak.x;
            const dy = y - peak.y;
            const distSquared = dx * dx + dy * dy;
            const influence = peak.height * Math.exp(-distSquared / (2 * peak.width * peak.width));
            value += influence;
          }
          
          // Add some noise
          value += (Math.random() * 0.1 - 0.05);
          newLandscape[y][x] = Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
        }
      }
    } else {
      // Unimodal landscape with a single global maximum
      const peakX = LANDSCAPE_RESOLUTION / 2 + (Math.random() * 20 - 10);
      const peakY = LANDSCAPE_RESOLUTION / 2 + (Math.random() * 20 - 10);
      const peakWidth = 25 + Math.random() * 15;
      
      for (let x = 0; x < LANDSCAPE_RESOLUTION; x++) {
        for (let y = 0; y < LANDSCAPE_RESOLUTION; y++) {
          const dx = x - peakX;
          const dy = y - peakY;
          const distSquared = dx * dx + dy * dy;
          let value = Math.exp(-distSquared / (2 * peakWidth * peakWidth));
          
          // Add some gentle noise
          value += (Math.random() * 0.05 - 0.025);
          newLandscape[y][x] = Math.max(0, Math.min(1, value));
        }
      }
    }
    
    setLandscape(newLandscape);
  };
  
  // Initialize on component mount
  useEffect(() => {
    generateLandscape();
  }, [landscapeType]);
  
  // Generate starting points
  const generateStartPoints = () => {
    // Clear existing solutions
    setSolutions([]);
    setCurrentStep(0);
    
    // Create new random starting points
    const newSolutions: Solution[] = [];
    
    for (let i = 0; i < numStartPoints; i++) {
      const x = Math.floor(Math.random() * LANDSCAPE_RESOLUTION);
      const y = Math.floor(Math.random() * LANDSCAPE_RESOLUTION);
      const value = landscape[y] ? (landscape[y][x] || 0) : 0;
      
      newSolutions.push({
        point: { x, y, value },
        trajectory: [{ x, y, value }],
        isComplete: false,
        success: false
      });
    }
    
    setSolutions(newSolutions);
  };
  
  // Run a single step of hill climbing for all solution trajectories
  const stepHillClimb = () => {
    if (!landscape.length) return;
    
    setSolutions(prevSolutions => {
      return prevSolutions.map(solution => {
        if (solution.isComplete) return solution;
        
        const { x, y } = solution.point;
        let bestX = x;
        let bestY = y;
        let bestValue = solution.point.value;
        let improved = false;
        
        // Check all 8 neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip current cell
            
            const nx = x + dx;
            const ny = y + dy;
            
            // Ensure we're within bounds
            if (nx >= 0 && nx < LANDSCAPE_RESOLUTION && ny >= 0 && ny < LANDSCAPE_RESOLUTION) {
              const neighborValue = landscape[ny][nx];
              
              if (neighborValue > bestValue) {
                bestX = nx;
                bestY = ny;
                bestValue = neighborValue;
                improved = true;
              }
            }
          }
        }
        
        // If no improvement found, we're at a local maximum
        if (!improved) {
          return { 
            ...solution, 
            isComplete: true,
            success: true
          };
        }
        
        // Move to the best neighbor
        return {
          ...solution,
          point: { x: bestX, y: bestY, value: bestValue },
          trajectory: [...solution.trajectory, { x: bestX, y: bestY, value: bestValue }]
        };
      });
    });
    
    setCurrentStep(prev => prev + 1);
  };
  
  // Logic for continuous animation
  useEffect(() => {
    if (!isRunning) return;
    
    // Check if all solutions are complete
    const allComplete = solutions.every(solution => solution.isComplete);
    if (allComplete) {
      setIsRunning(false);
      return;
    }
    
    const timer = setTimeout(() => {
      stepHillClimb();
    }, Math.max(10, 1000 - animationSpeed * 10));
    
    return () => clearTimeout(timer);
  }, [isRunning, solutions, currentStep, animationSpeed]);
  
  // Convert logical coordinates to canvas coordinates
  const logicalToCanvasCoords = (logicalX: number, logicalY: number, rect: DOMRect): { x: number, y: number } => {
    const scaleX = rect.width / BASE_WIDTH;
    const scaleY = rect.height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    const canvasX = logicalX * scale + offsetX;
    const canvasY = logicalY * scale + offsetY;
    
    return { x: canvasX, y: canvasY };
  };
  
  // Draw the visualization on canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !landscape.length) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set up the canvas buffer size
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale to fit entire logical space
    const scaleX = rect.width / BASE_WIDTH;
    const scaleY = rect.height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offset
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    // Pixel size for each landscape cell
    const cellWidth = (BASE_WIDTH * scale) / LANDSCAPE_RESOLUTION;
    const cellHeight = (BASE_HEIGHT * scale) / LANDSCAPE_RESOLUTION;
    
    // Draw the landscape
    for (let y = 0; y < LANDSCAPE_RESOLUTION; y++) {
      for (let x = 0; x < LANDSCAPE_RESOLUTION; x++) {
        const value = landscape[y][x];
        
        if (showGradient) {
          // Map value to color gradient
          const colorIndex = Math.min(colors.landscape.length - 1, Math.floor(value * colors.landscape.length));
          ctx.fillStyle = colors.landscape[colorIndex];
        } else {
          // Grayscale representation
          const brightness = Math.floor(value * 255);
          ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        }
        
        ctx.fillRect(
          x * cellWidth + offsetX,
          y * cellHeight + offsetY,
          cellWidth + 0.5,
          cellHeight + 0.5
        );
      }
    }
    
    // Draw contour lines
    if (showContour) {
      ctx.strokeStyle = colors.contour;
      ctx.lineWidth = 0.5;
      
      const contourLevels = 10;
      for (let level = 1; level < contourLevels; level++) {
        const threshold = level / contourLevels;
        
        for (let y = 0; y < LANDSCAPE_RESOLUTION - 1; y++) {
          for (let x = 0; x < LANDSCAPE_RESOLUTION - 1; x++) {
            const v1 = landscape[y][x];
            const v2 = landscape[y][x + 1];
            const v3 = landscape[y + 1][x];
            const v4 = landscape[y + 1][x + 1];
            
            // Draw contour if threshold passes through this cell
            if ((v1 <= threshold && v2 > threshold) || (v1 > threshold && v2 <= threshold)) {
              const t = (threshold - v1) / (v2 - v1);
              const startX = (x + t) * cellWidth + offsetX;
              const startY = y * cellHeight + offsetY;
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(startX, startY + cellHeight);
              ctx.stroke();
            }
            
            if ((v1 <= threshold && v3 > threshold) || (v1 > threshold && v3 <= threshold)) {
              const t = (threshold - v1) / (v3 - v1);
              const startX = x * cellWidth + offsetX;
              const startY = (y + t) * cellHeight + offsetY;
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(startX + cellWidth, startY);
              ctx.stroke();
            }
          }
        }
      }
    }
    
    // Draw solution trajectories
    if (showTrajectory) {
      solutions.forEach(solution => {
        const { trajectory } = solution;
        
        // Draw path
        if (trajectory.length > 1) {
          ctx.strokeStyle = colors.path;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          trajectory.forEach((point, index) => {
            const canvasX = point.x * cellWidth + offsetX + cellWidth / 2;
            const canvasY = point.y * cellHeight + offsetY + cellHeight / 2;
            
            if (index === 0) {
              ctx.moveTo(canvasX, canvasY);
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          });
          
          ctx.stroke();
        }
        
        // Draw starting point
        if (trajectory.length > 0) {
          const startPoint = trajectory[0];
          const startX = startPoint.x * cellWidth + offsetX + cellWidth / 2;
          const startY = startPoint.y * cellHeight + offsetY + cellHeight / 2;
          
          ctx.fillStyle = colors.startPoint;
          ctx.beginPath();
          ctx.arc(startX, startY, 5, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw current point
          const currentPoint = solution.point;
          const currentX = currentPoint.x * cellWidth + offsetX + cellWidth / 2;
          const currentY = currentPoint.y * cellHeight + offsetY + cellHeight / 2;
          
          if (solution.isComplete) {
            // Draw success indicator (local maximum)
            ctx.fillStyle = colors.maxima;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Add star pattern for maxima
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
              const angle = i * Math.PI / 4;
              ctx.beginPath();
              ctx.moveTo(currentX, currentY);
              ctx.lineTo(
                currentX + Math.cos(angle) * 12,
                currentY + Math.sin(angle) * 12
              );
              ctx.stroke();
            }
          } else {
            // Draw current search position
            ctx.fillStyle = colors.currentPoint;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });
    }
  };
  
  // Update canvas when needed
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    drawCanvas();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [landscape, solutions, showGradient, showTrajectory, showContour]);
  
  return (
    <div className="min-h-screen bg-black text-white">

      <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col justify-center pt-20">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text">
            Hill Climbing Optimization
          </h1>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl mb-8">
            {/* Controls - Top section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant="outline"
                  disabled={solutions.length === 0 || solutions.every(s => s.isComplete)}
                  className="flex-1 sm:flex-none"
                >
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRunning ? 'Pause' : 'Start'}
                </Button>
                
                <Button
                  onClick={stepHillClimb}
                  variant="outline"
                  disabled={isRunning || solutions.length === 0 || solutions.every(s => s.isComplete)}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Step
                </Button>
                
                <Button
                  onClick={generateStartPoints}
                  variant="outline"
                  disabled={isRunning}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Climbers
                </Button>
                
                <Button
                  onClick={generateLandscape}
                  variant="outline"
                  disabled={isRunning}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New Landscape
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[90px]">Speed:</span>
                  <div className="flex items-center gap-2 w-full">
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      min={1}
                      max={95}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[90px]">Climbers:</span>
                  <div className="flex items-center gap-2 w-full">
                    <Slider
                      value={[numStartPoints]}
                      onValueChange={(value) => setNumStartPoints(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                      disabled={isRunning}
                    />
                    <span className="w-6 text-right">{numStartPoints}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - Landscape type and display options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="mb-2">Landscape Type:</div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setLandscapeType('multimodal')}
                    variant={landscapeType === 'multimodal' ? 'default' : 'outline'}
                    className="flex-1"
                    disabled={isRunning}
                  >
                    Multi-modal
                  </Button>
                  <Button
                    onClick={() => setLandscapeType('unimodal')}
                    variant={landscapeType === 'unimodal' ? 'default' : 'outline'}
                    className="flex-1"
                    disabled={isRunning}
                  >
                    Unimodal
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span>Show Color Gradient</span>
                  <Switch
                    checked={showGradient}
                    onCheckedChange={setShowGradient}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Show Contour Lines</span>
                  <Switch
                    checked={showContour}
                    onCheckedChange={setShowContour}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Show Trajectories</span>
                  <Switch
                    checked={showTrajectory}
                    onCheckedChange={setShowTrajectory}
                  />
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-3 rounded-lg text-center">
                <div className="text-sm text-gray-400">Current Step</div>
                <div className="text-xl">{currentStep}</div>
              </div>
              
              <div className="glass-card p-3 rounded-lg text-center">
                <div className="text-sm text-gray-400">Local Maxima Found</div>
                <div className="text-xl">
                  {solutions.filter(s => s.isComplete && s.success).length}/{numStartPoints}
                </div>
              </div>
              
              <div className="glass-card p-3 rounded-lg text-center">
                <div className="text-sm text-gray-400">Best Value</div>
                <div className="text-xl">
                  {solutions.length > 0
                    ? Math.max(...solutions.map(s => s.point.value)).toFixed(2)
                    : '0.00'}
                </div>
              </div>
            </div>
            
            {/* Canvas */}
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <div className="relative bg-black/50 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                  <canvas
                    ref={canvasRef}
                    width={BASE_WIDTH}
                    height={BASE_HEIGHT}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.startPoint }}></div>
                <span className="text-sm text-gray-300">Starting Point</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.currentPoint }}></div>
                <span className="text-sm text-gray-300">Current Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.maxima }}></div>
                <span className="text-sm text-gray-300">Local Maximum</span>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
            <p className="text-gray-300 mb-4">
              Hill climbing is a mathematical optimization technique that belongs to the local search family of algorithms:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>It starts at a random position in the search space (landscape)</li>
              <li>Evaluates all neighboring positions and moves to the one with the highest value</li>
              <li>Continues this process until no neighbor has a higher value, indicating a local maximum</li>
              <li>The algorithm is greedy and simple, but can get trapped in local optima</li>
              <li>Multiple random restarts are often used to find better solutions</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Generate different landscapes: unimodal (one peak) or multimodal (multiple peaks)</li>
                <li>Place multiple hill climbers to see how they converge to different local maxima</li>
                <li>Step through the optimization process or watch it animate automatically</li>
                <li>Toggle visualization options to better understand the search space</li>
                <li>Compare how different starting points lead to different solutions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HillClimbVisualization;