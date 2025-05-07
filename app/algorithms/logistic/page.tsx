"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, GitGraph } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Point {
  x: number;
  y: number;
  label: number; // 0 or 1
}

interface Model {
  weights: number[]; // [w0, w1, w2] for bias, x, y
  learningRate: number;
  iterations: number;
}

const LogisticRegressionVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [model, setModel] = useState<Model>({
    weights: [0, 0, 0],
    learningRate: 0.01,
    iterations: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [learningRate, setLearningRate] = useState(0.01);
  const [showDecisionBoundary, setShowDecisionBoundary] = useState(true);
  const [selectedClass, setSelectedClass] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Base dimensions for the virtual canvas
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 600;
  
  // Class colors
  const classColors = ['#4285F4', '#EA4335']; // Blue for 0, Red for 1

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sigmoid function
  const sigmoid = (z: number): number => {
    return 1 / (1 + Math.exp(-z));
  };

  // Predict probability using current model weights
  const predict = (point: Point): number => {
    const [w0, w1, w2] = model.weights;
    const z = w0 + w1 * point.x + w2 * point.y;
    return sigmoid(z);
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
    
    return { 
      x: logicalX * scale + offsetX, 
      y: logicalY * scale + offsetY 
    };
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
      x: x / BASE_WIDTH,  // Normalize to [0, 1]
      y: y / BASE_HEIGHT, // Normalize to [0, 1]
      label: selectedClass
    };
    
    setPoints([...points, newPoint]);
  };

  // Update model weights using gradient descent
  const updateWeights = () => {
    if (points.length === 0) return;

    const [w0, w1, w2] = model.weights;
    let gradient_w0 = 0;
    let gradient_w1 = 0;
    let gradient_w2 = 0;
    
    // Calculate gradients
    points.forEach(point => {
      const prediction = predict(point);
      const error = prediction - point.label;
      
      gradient_w0 += error;
      gradient_w1 += error * point.x;
      gradient_w2 += error * point.y;
    });
    
    // Normalize gradients
    gradient_w0 /= points.length;
    gradient_w1 /= points.length;
    gradient_w2 /= points.length;
    
    // Update weights
    const newWeights = [
      w0 - model.learningRate * gradient_w0,
      w1 - model.learningRate * gradient_w1,
      w2 - model.learningRate * gradient_w2
    ];
    
    setModel({
      ...model, 
      weights: newWeights,
      iterations: model.iterations + 1
    });
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
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    if (showDecisionBoundary && points.length > 0) {
      const [w0, w1, w2] = model.weights;
      
      // Draw the decision boundary (where sigmoid = 0.5, or z = 0)
      if (w2 !== 0) {
        // Calculate two points on the decision boundary line
        // z = w0 + w1*x + w2*y = 0
        // => y = -(w0 + w1*x) / w2
        
        const x1 = 0;
        const y1 = -(w0 + w1 * x1) / w2;
        const x2 = 1;
        const y2 = -(w0 + w1 * x2) / w2;
        
        // Convert to canvas coordinates
        const canvas_x1 = x1 * BASE_WIDTH * scale + offsetX;
        const canvas_y1 = y1 * BASE_HEIGHT * scale + offsetY;
        const canvas_x2 = x2 * BASE_WIDTH * scale + offsetX;
        const canvas_y2 = y2 * BASE_HEIGHT * scale + offsetY;
        
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(canvas_x1, canvas_y1);
        ctx.lineTo(canvas_x2, canvas_y2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw probability regions (heatmap)
      const gridSize = 10;
      for (let x = 0; x < BASE_WIDTH; x += gridSize) {
        for (let y = 0; y < BASE_HEIGHT; y += gridSize) {
          const point = {
            x: x / BASE_WIDTH,
            y: y / BASE_HEIGHT,
            label: 0
          };
          
          const prob = predict(point);
          const color = prob > 0.5 ? 
            `rgba(234, 67, 53, ${prob * 0.25})` : // Red for class 1
            `rgba(66, 133, 244, ${(1 - prob) * 0.25})`; // Blue for class 0
          
          ctx.fillStyle = color;
          const canvasX = x * scale + offsetX;
          const canvasY = y * scale + offsetY;
          ctx.fillRect(canvasX, canvasY, gridSize * scale, gridSize * scale);
        }
      }
    }
    
    // Draw all points
    const pointRadius = 6 * scale;
    points.forEach(point => {
      const canvasX = point.x * BASE_WIDTH * scale + offsetX;
      const canvasY = point.y * BASE_HEIGHT * scale + offsetY;
      
      // Draw point
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = classColors[point.label];
      ctx.fill();
      
      // Add border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  // Generate random points for each class
  const generateRandomPoints = () => {
    const newPoints: Point[] = [];
    const pointsPerClass = 20;
    
    // Generate class 0 points (clustered in top-left)
    for (let i = 0; i < pointsPerClass; i++) {
      newPoints.push({
        x: Math.random() * 0.4,
        y: Math.random() * 0.4,
        label: 0
      });
    }
    
    // Generate class 1 points (clustered in bottom-right)
    for (let i = 0; i < pointsPerClass; i++) {
      newPoints.push({
        x: 0.6 + Math.random() * 0.4,
        y: 0.6 + Math.random() * 0.4,
        label: 1
      });
    }
    
    setPoints(newPoints);
  };

  // Reset the model and clear points
  const resetModel = () => {
    setModel({
      weights: [0, 0, 0],
      learningRate,
      iterations: 0
    });
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
  }, [points, model, showDecisionBoundary]);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        updateWeights();
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isRunning, model, points]);

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
            Logistic Regression Visualization
          </h1>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl mb-8">
            {/* Controls - Top section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRunning ? 'Pause' : 'Start'}
                </Button>
                
                <Button
                  onClick={() => {
                    setIsRunning(false);
                    resetModel();
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Model
                </Button>
                
                <Button
                  onClick={() => {
                    setIsRunning(false);
                    resetModel();
                    generateRandomPoints();
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  Generate Points
                </Button>
                
                <div className="w-full text-center sm:text-left mt-2 sm:mt-0">
                  Iterations: {model.iterations}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="min-w-[140px]">Learning Rate:</span>
                  <div className="flex items-center gap-2 w-full">
                    <Slider
                      value={[learningRate * 1000]}
                      onValueChange={(value) => {
                        const newRate = value[0] / 1000;
                        setLearningRate(newRate);
                        setModel({...model, learningRate: newRate});
                      }}
                      min={1}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-right">{learningRate.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - Class selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="mb-2">Add Points:</div>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map(classIdx => (
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
                      Class {classIdx}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Show Decision Boundary</span>
                <Switch
                  checked={showDecisionBoundary}
                  onCheckedChange={setShowDecisionBoundary}
                />
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
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    onClick={handleCanvasClick}
                  />
                </div>
              </div>
            </div>
            
            {/* Model weights display */}
            <div className="mt-6 text-center">
              <p className="mb-2 font-mono">Model: P(y=1) = sigmoid({model.weights[0].toFixed(3)} + {model.weights[1].toFixed(3)}x + {model.weights[2].toFixed(3)}y)</p>
            </div>
          </div>
          
          <div className="glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
            <p className="text-gray-300 mb-4">
              Logistic Regression is a supervised learning algorithm used for binary classification problems:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>The algorithm learns weights for a linear function: z = w₀ + w₁x + w₂y</li>
              <li>This linear function is transformed using the sigmoid function: P(y=1) = 1/(1+e⁻ᶻ)</li>
              <li>The result is a probability between 0 and 1, with 0.5 as the decision boundary</li>
              <li>Gradient descent is used to find the optimal weights that minimize classification error</li>
            </ol>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Add points of either class by clicking on the canvas</li>
                <li>Adjust the learning rate to control how quickly the model learns</li>
                <li>View the decision boundary and probability regions in real-time</li>
                <li>Generate random points to quickly test the algorithm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticRegressionVisualization;