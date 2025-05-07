"use client";

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { GitGraph, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Point {
  x: number;
  y: number;
  classLabel: number; // 0, 1, 2 for different classes
  isTest?: boolean;   // Whether this is a test point
}

const KNNVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [k, setK] = useState(3);
  const [selectedClass, setSelectedClass] = useState(0);
  const [placementMode, setPlacementMode] = useState('train'); // 'train' or 'test'
  const [showGrid, setShowGrid] = useState(false);
  const [showDecisionBoundary, setShowDecisionBoundary] = useState(false);
  const [gridResolution, setGridResolution] = useState(20); // pixels between grid points
  const [scrolled, setScrolled] = useState(false);

  // Base dimensions for the virtual canvas
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 600;

  // Class colors (using a color blind friendly palette)
  const classColors = [
    '#4285F4', // Blue
    '#EA4335', // Red
    '#FBBC05', // Yellow
    '#34A853', // Green
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to logical coordinates
    const { x, y } = canvasToLogicalCoords(mouseX, mouseY, rect);
    
    const newPoint: Point = {
      x,
      y,
      classLabel: selectedClass,
      isTest: placementMode === 'test'
    };
    
    setPoints([...points, newPoint]);
  };

  // Calculate Euclidean distance between points
  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Find k nearest neighbors for a point
  const findKNearestNeighbors = (point: Point, trainingPoints: Point[]): Point[] => {
    const distances = trainingPoints.map(p => ({
      point: p,
      distance: calculateDistance(point, p)
    }));
    
    // Sort by distance and take first k
    return distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
      .map(d => d.point);
  };

  // Classify a point based on k nearest neighbors
  const classifyPoint = (point: Point, trainingPoints: Point[]): number => {
    if (trainingPoints.length === 0) return 0;
    
    const neighbors = findKNearestNeighbors(point, trainingPoints);
    
    // Count votes for each class
    const votes = neighbors.reduce((counts, neighbor) => {
      counts[neighbor.classLabel] = (counts[neighbor.classLabel] || 0) + 1;
      return counts;
    }, {} as Record<number, number>);
    
    // Find the class with the most votes
    let maxCount = 0;
    let winningClass = 0;
    
    Object.entries(votes).forEach(([classLabel, count]) => {
      if (count > maxCount) {
        maxCount = count;
        winningClass = parseInt(classLabel);
      }
    });
    
    return winningClass;
  };

  // Convert canvas coordinates to logical coordinates
  const canvasToLogicalCoords = (canvasX: number, canvasY: number, rect: DOMRect): { x: number, y: number } => {
    const scaleX = rect.width / BASE_WIDTH;
    const scaleY = rect.height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    const logicalX = (canvasX - offsetX) / scale;
    const logicalY = (canvasY - offsetY) / scale;
    
    return { 
      x: Math.max(0, Math.min(BASE_WIDTH, logicalX)), 
      y: Math.max(0, Math.min(BASE_HEIGHT, logicalY)) 
    };
  };

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

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Calculate scale to fit entire logical space
    const scaleX = rect.width / BASE_WIDTH;
    const scaleY = rect.height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offset
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    // Separate training and test points
    const trainingPoints = points.filter(p => !p.isTest);
    
    // Draw decision boundary if enabled
    if (showDecisionBoundary && trainingPoints.length > 0) {
      const gridSize = Math.max(10, gridResolution);
      const step = scale * gridSize;
      
      for (let canvasX = offsetX; canvasX < offsetX + BASE_WIDTH * scale; canvasX += step) {
        for (let canvasY = offsetY; canvasY < offsetY + BASE_HEIGHT * scale; canvasY += step) {
          const { x: logicalX, y: logicalY } = canvasToLogicalCoords(canvasX, canvasY, rect);
          
          const testPoint: Point = { x: logicalX, y: logicalY, classLabel: -1, isTest: true };
          const predictedClass = classifyPoint(testPoint, trainingPoints);
          
          // Draw small semi-transparent square for the decision region
          ctx.fillStyle = `${classColors[predictedClass]}40`; // 40 is hex for 25% opacity
          
          const squareSize = step;
          ctx.fillRect(
            canvasX - squareSize/2, 
            canvasY - squareSize/2, 
            squareSize, 
            squareSize
          );
        }
      }
    }
    
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= BASE_WIDTH; x += 50) {
        ctx.beginPath();
        const { x: startX, y: startY } = logicalToCanvasCoords(x, 0, rect);
        const { x: endX, y: endY } = logicalToCanvasCoords(x, BASE_HEIGHT, rect);
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= BASE_HEIGHT; y += 50) {
        ctx.beginPath();
        const { x: startX, y: startY } = logicalToCanvasCoords(0, y, rect);
        const { x: endX, y: endY } = logicalToCanvasCoords(BASE_WIDTH, y, rect);
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    
    // Draw all points
    points.forEach(point => {
      const { x: canvasX, y: canvasY } = logicalToCanvasCoords(point.x, point.y, rect);
      
      if (point.isTest) {
        // For test points, get the predicted class
        const trainingPoints = points.filter(p => !p.isTest);
        const predictedClass = classifyPoint(point, trainingPoints);
        const pointSize = 8;
        
        // Draw outer ring in the predicted class color
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointSize + 3, 0, Math.PI * 2);
        ctx.fillStyle = classColors[predictedClass];
        ctx.fill();
        
        // Draw inner circle (white)
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointSize - 1, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add a small indicator of the predicted class in the center
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = classColors[predictedClass];
        ctx.fill();
        
        // Draw connections to their k nearest neighbors
        const neighbors = findKNearestNeighbors(point, trainingPoints);
        neighbors.forEach(neighbor => {
          const { x: neighborX, y: neighborY } = logicalToCanvasCoords(neighbor.x, neighbor.y, rect);
          
          // Draw line to neighbor
          ctx.beginPath();
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(neighborX, neighborY);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      } else {
        // Draw regular training points
        const pointSize = 6;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointSize, 0, Math.PI * 2);
        ctx.fillStyle = classColors[point.classLabel];
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  };

  // Reset all points
  const resetPoints = () => {
    setPoints([]);
  };

  // Generate random points for each class
  const generateRandomPoints = () => {
    const numClasses = 3;
    const pointsPerClass = 20;
    const newPoints: Point[] = [];
    
    // Generate points for each class
    for (let classLabel = 0; classLabel < numClasses; classLabel++) {
      // Create a cluster center for this class
      const centerX = 100 + (classLabel * 250);
      const centerY = 150 + (classLabel * 100);
      
      // Add points around the center
      for (let i = 0; i < pointsPerClass; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100;
        
        newPoints.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          classLabel,
          isTest: false
        });
      }
    }
    
    // Add some test points
    for (let i = 0; i < 5; i++) {
      newPoints.push({
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
        classLabel: -1, // Will be determined by KNN
        isTest: true
      });
    }
    
    setPoints(newPoints);
  };

  useEffect(() => {
    const resizeCanvas = () => {
      drawCanvas();
    };

    window.addEventListener('resize', resizeCanvas);
    drawCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [points, k, showGrid, showDecisionBoundary, gridResolution]);

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
            K-Nearest Neighbors Visualization
          </h1>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl mb-8">
            {/* Controls - Top section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button
                  onClick={generateRandomPoints}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Points
                </Button>
                
                <Button
                  onClick={resetPoints}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[90px]">K Value:</span>
                  <div className="flex items-center gap-2 w-full">
                    <Slider
                      value={[k]}
                      onValueChange={(value) => setK(value[0])}
                      min={1}
                      max={15}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-4 text-right">{k}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - Placement mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="mb-2">Placement Mode:</div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setPlacementMode('train')}
                    variant={placementMode === 'train' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    Training Points
                  </Button>
                  <Button
                    onClick={() => setPlacementMode('test')}
                    variant={placementMode === 'test' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    Test Points
                  </Button>
                </div>
              </div>
              
              <div>
                {placementMode === 'train' && (
                  <div className="space-y-2">
                    <div className="mb-2">Class Selection:</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map(classIdx => (
                        <button
                          key={classIdx}
                          onClick={() => setSelectedClass(classIdx)}
                          className={cn(
                            "w-full h-10 rounded-md border flex items-center justify-center",
                            selectedClass === classIdx 
                              ? "border-white" 
                              : "border-transparent hover:border-white/50"
                          )}
                          style={{ backgroundColor: classColors[classIdx] }}
                        >
                          {classIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Controls - Visualization options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center justify-between">
                <span>Show Grid</span>
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Show Decision Boundary</span>
                <Switch
                  checked={showDecisionBoundary}
                  onCheckedChange={setShowDecisionBoundary}
                />
              </div>
              
              {showDecisionBoundary && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[110px]">Grid Resolution:</span>
                  <div className="flex items-center gap-2 w-full">
                    <Slider
                      value={[gridResolution]}
                      onValueChange={(value) => setGridResolution(value[0])}
                      min={10}
                      max={40}
                      step={5}
                      className="flex-1"
                    />
                    <span className="w-8 text-right">{gridResolution}px</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Canvas */}
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <div className="relative bg-black/50 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                  <canvas
                    ref={canvasRef}
                    width={BASE_WIDTH}
                    height={BASE_HEIGHT}
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    onClick={handleCanvasClick}
                  />
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 justify-center">
              {['Class 1', 'Class 2', 'Class 3', 'Class 4'].map((label, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: classColors[idx] }}
                  ></div>
                  <span className="text-sm text-gray-300">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white p-[2px]">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
                <span className="text-sm text-gray-300">Test Point (colored by predicted class)</span>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
            <p className="text-gray-300 mb-4">
              K-Nearest Neighbors (KNN) is a simple supervised machine learning algorithm used for classification and regression:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>When a new point needs to be classified, the algorithm finds the K closest training points</li>
              <li>It assigns the new point to the class that appears most frequently among its K nearest neighbors</li>
              <li>The distance between points is typically calculated using the Euclidean distance</li>
              <li>The choice of K affects the decision boundary smoothness - lower values create more complex boundaries</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Add training points of different classes by clicking on the canvas</li>
                <li>Add test points to see how they get classified</li>
                <li>Adjust the K value to see how it affects classification</li>
                <li>Toggle the decision boundary visualization to see classification regions</li>
                <li>Generate random points to quickly test the algorithm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KNNVisualization;