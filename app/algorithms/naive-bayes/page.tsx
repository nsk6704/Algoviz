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
  classLabel: number;
  isTest?: boolean;
}

interface GaussianDistribution {
  mean: number;
  variance: number;
}

interface ClassDistribution {
  xDist: GaussianDistribution;
  yDist: GaussianDistribution;
  prior: number;
}

const NaiveBayesVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [classDistributions, setClassDistributions] = useState<ClassDistribution[]>([]);
  const [selectedClass, setSelectedClass] = useState(0);
  const [placementMode, setPlacementMode] = useState('train'); // 'train' or 'test'
  const [showGrid, setShowGrid] = useState(false);
  const [showDistributions, setShowDistributions] = useState(true);
  const [showDecisionBoundary, setShowDecisionBoundary] = useState(false);
  const [gridResolution, setGridResolution] = useState(20);
  const [scrolled, setScrolled] = useState(false);

  // Base dimensions for the virtual canvas
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 600;
  
  // Class colors (using a color blind friendly palette)
  const classColors = [
    '#4285F4', // Blue
    '#EA4335', // Red
    '#FBBC05', // Yellow
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    
    // Update the distributions after adding a new training point
    if (!newPoint.isTest) {
      updateDistributions([...points, newPoint]);
    }
  };

  // Calculate mean of an array
  const calculateMean = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  // Calculate variance of an array
  const calculateVariance = (values: number[], mean: number): number => {
    if (values.length <= 1) return 1; // Default small variance to avoid division by zero
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  };

  // Update Gaussian distributions for each class and feature
  const updateDistributions = (currentPoints: Point[]) => {
    const trainingPoints = currentPoints.filter(p => !p.isTest);
    const uniqueClasses = Array.from(new Set(trainingPoints.map(p => p.classLabel)));
    const totalPoints = trainingPoints.length;
    
    const newDistributions: ClassDistribution[] = uniqueClasses.map(classLabel => {
      const classPoints = trainingPoints.filter(p => p.classLabel === classLabel);
      const classCount = classPoints.length;
      
      // X feature distribution
      const xValues = classPoints.map(p => p.x);
      const xMean = calculateMean(xValues);
      const xVariance = calculateVariance(xValues, xMean);
      
      // Y feature distribution
      const yValues = classPoints.map(p => p.y);
      const yMean = calculateMean(yValues);
      const yVariance = calculateVariance(yValues, yMean);
      
      return {
        xDist: { mean: xMean, variance: Math.max(xVariance, 100) }, // Min variance to avoid overfitting
        yDist: { mean: yMean, variance: Math.max(yVariance, 100) },
        prior: totalPoints > 0 ? classCount / totalPoints : 1 / uniqueClasses.length // Class prior probability
      };
    });
    
    setClassDistributions(newDistributions);
  };

  // Calculate Gaussian probability density function
  const gaussianPDF = (x: number, mean: number, variance: number): number => {
    if (variance === 0) return x === mean ? 1 : 0;
    const exponent = -Math.pow(x - mean, 2) / (2 * variance);
    return (1 / Math.sqrt(2 * Math.PI * variance)) * Math.exp(exponent);
  };

  // Classify a point using Naive Bayes
  const classifyPoint = (point: Point): number => {
    if (classDistributions.length === 0) return 0;
    
    let maxPosterior = -Infinity;
    let predictedClass = 0;
    
    classDistributions.forEach((dist, classLabel) => {
      // Calculate likelihood: P(x|class) * P(y|class)
      const xLikelihood = gaussianPDF(point.x, dist.xDist.mean, dist.xDist.variance);
      const yLikelihood = gaussianPDF(point.y, dist.yDist.mean, dist.yDist.variance);
      
      // Calculate posterior: P(features|class) * P(class)
      // Note: We're working in log space to avoid numerical underflow
      const logPosterior = Math.log(xLikelihood) + Math.log(yLikelihood) + Math.log(dist.prior);
      
      if (logPosterior > maxPosterior) {
        maxPosterior = logPosterior;
        predictedClass = classLabel;
      }
    });
    
    return predictedClass;
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
    
    // Draw decision boundary if enabled
    if (showDecisionBoundary && classDistributions.length > 0) {
      const gridSize = Math.max(10, gridResolution);
      const step = scale * gridSize;
      
      for (let canvasX = offsetX; canvasX < offsetX + BASE_WIDTH * scale; canvasX += step) {
        for (let canvasY = offsetY; canvasY < offsetY + BASE_HEIGHT * scale; canvasY += step) {
          const { x: logicalX, y: logicalY } = canvasToLogicalCoords(canvasX, canvasY, rect);
          
          const testPoint: Point = { x: logicalX, y: logicalY, classLabel: -1 };
          const predictedClass = classifyPoint(testPoint);
          
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
    
    // Draw distribution ellipses if enabled
    if (showDistributions && classDistributions.length > 0) {
      classDistributions.forEach((dist, classIdx) => {
        if (dist.xDist.variance === 0 || dist.yDist.variance === 0) return;
        
        // Convert mean coordinates to canvas coordinates
        const { x: meanX, y: meanY } = logicalToCanvasCoords(dist.xDist.mean, dist.yDist.mean, rect);
        
        // Calculate ellipse dimensions based on variance
        const xRadius = Math.sqrt(dist.xDist.variance) * scale;
        const yRadius = Math.sqrt(dist.yDist.variance) * scale;
        
        // Draw 1-standard deviation ellipse
        ctx.beginPath();
        ctx.ellipse(meanX, meanY, xRadius, yRadius, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = classColors[classIdx];
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw 2-standard deviation ellipse
        ctx.beginPath();
        ctx.ellipse(meanX, meanY, xRadius * 2, yRadius * 2, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = `${classColors[classIdx]}80`; // 50% opacity
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw mean point
        ctx.beginPath();
        ctx.arc(meanX, meanY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = classColors[classIdx];
        ctx.fill();
      });
    }
    
    // Draw all points
    points.forEach(point => {
      const { x: canvasX, y: canvasY } = logicalToCanvasCoords(point.x, point.y, rect);
      
      if (point.isTest) {
        // For test points, get the predicted class
        const predictedClass = classifyPoint(point);
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
      } else {
        // Draw regular training points
        const pointSize = 6;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointSize, 0, Math.PI * 2);
        ctx.fillStyle = classColors[point.classLabel];
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  };

  // Reset all points and distributions
  const resetPoints = () => {
    setPoints([]);
    setClassDistributions([]);
  };

  // Generate random points for each class
  const generateRandomPoints = () => {
    const numClasses = 3;
    const pointsPerClass = 30;
    const newPoints: Point[] = [];
    
    // Generate points for each class
    for (let classLabel = 0; classLabel < numClasses; classLabel++) {
      // Create a cluster center for this class
      const centerX = 100 + (classLabel * 250);
      const centerY = 250 + ((classLabel % 2) * 100);
      
      // Set different spread for each class to make it more interesting
      const spreadX = 70 + (classLabel * 20);
      const spreadY = 50 + (classLabel * 15);
      
      // Add points with Gaussian distribution around the center
      for (let i = 0; i < pointsPerClass; i++) {
        // Box-Muller transform to get gaussian random numbers
        const u = Math.random();
        const v = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        const z1 = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);
        
        newPoints.push({
          x: centerX + z0 * spreadX,
          y: centerY + z1 * spreadY,
          classLabel,
          isTest: false
        });
      }
    }
    
    // Add some test points
    for (let i = 0; i < 10; i++) {
      newPoints.push({
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
        classLabel: -1, // Will be determined by classifier
        isTest: true
      });
    }
    
    setPoints(newPoints);
    updateDistributions(newPoints);
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
  }, [points, showGrid, showDistributions, showDecisionBoundary, gridResolution, classDistributions]);

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
            Naive Bayes Visualization
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
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(classIdx => (
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
                          Class {classIdx + 1}
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
                <span>Show Distributions</span>
                <Switch
                  checked={showDistributions}
                  onCheckedChange={setShowDistributions}
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
              {['Class 1', 'Class 2', 'Class 3'].map((label, idx) => (
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
              Naive Bayes is a probabilistic classifier based on applying Bayes' theorem with strong independence assumptions between features:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>The algorithm models each feature (x, y coordinates) as having a Gaussian distribution for each class</li>
              <li>When classifying a new point, it calculates P(class|features) ∝ P(features|class) × P(class)</li>
              <li>The "naive" assumption is that features are independent, so P(x,y|class) = P(x|class) × P(y|class)</li>
              <li>The class with the highest posterior probability is selected as the prediction</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Add training points of different classes by clicking on the canvas</li>
                <li>Add test points to see how they get classified</li>
                <li>Toggle distribution visualization to see the Gaussian models for each feature</li>
                <li>View decision boundaries to understand how the algorithm partitions the feature space</li>
                <li>Generate random points to quickly test the algorithm with different data distributions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NaiveBayesVisualization;