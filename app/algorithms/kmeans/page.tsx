"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, SprayCan as Spray, GitGraph } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Point {
  x: number;
  y: number;
  cluster: number;
}

interface Centroid {
  x: number;
  y: number;
}

const KMeansVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [k, setK] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50); // 0-100, higher is faster
  const [sprayDensity, setSprayDensity] = useState(100); // number of points
  const [sprayRadius, setSprayRadius] = useState(50); // 0-100
  const [isSprayMode, setIsSprayMode] = useState(true);
  const [lastSprayPos, setLastSprayPos] = useState<{ x: number; y: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Base dimensions for the virtual canvas that all coordinates are relative to
  const BASE_WIDTH = 800;
  const BASE_HEIGHT = 600;

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEEAD', '#D4A5A5',
    '#9B59B6', '#3498DB', '#F1C40F'
  ];

  const generateRandomPoints = (count: number) => {
    const newPoints: Point[] = [];
    for (let i = 0; i < count; i++) {
      newPoints.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        cluster: -1
      });
    }
    return newPoints;
  };

  const initializePoints = () => {
    setPoints(generateRandomPoints(sprayDensity));
    initializeCentroids();
    setIteration(0);
  };

  const initializeCentroids = () => {
    const newCentroids: Centroid[] = [];
    
    // Distribute centroids evenly across the canvas
    const rows = Math.ceil(Math.sqrt(k)); // Number of rows
    const cols = Math.ceil(k / rows); // Number of columns
    const cellWidth = BASE_WIDTH / cols;
    const cellHeight = BASE_HEIGHT / rows;

    let count = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (count >= k) break;
        newCentroids.push({
          x: (col + 0.5) * cellWidth, // Center of the cell
          y: (row + 0.5) * cellHeight // Center of the cell
        });
        count++;
      }
    }

    setCentroids(newCentroids);
  };

  const assignClusters = () => {
    const newPoints = points.map(point => {
      let minDist = Infinity;
      let cluster = 0;
      
      centroids.forEach((centroid, idx) => {
        const dist = Math.sqrt(
          Math.pow(point.x - centroid.x, 2) + 
          Math.pow(point.y - centroid.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          cluster = idx;
        }
      });
      
      return { ...point, cluster };
    });
    
    setPoints(newPoints);
  };

  const updateCentroids = () => {
    const newCentroids = centroids.map((_, idx) => {
      const clusterPoints = points.filter(p => p.cluster === idx);
      if (clusterPoints.length === 0) return centroids[idx];
      
      const avgX = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
      const avgY = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
      
      // Smooth transition
      const currentCentroid = centroids[idx];
      const smoothingFactor = 0.1; // Smaller value = smoother transition
      
      return {
        x: currentCentroid.x + (avgX - currentCentroid.x) * smoothingFactor,
        y: currentCentroid.y + (avgY - currentCentroid.y) * smoothingFactor
      };
    });
    
    setCentroids(newCentroids);
  };

  // Convert canvas coordinates to logical coordinates
  const canvasToLogicalCoords = (canvasX: number, canvasY: number, rect: DOMRect): { x: number, y: number } => {
    // Calculate the scale and offset used in rendering
    const scaleX = rect.width / BASE_WIDTH;
    const scaleY = rect.height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    // Inverse transform to get logical coordinates
    const logicalX = (canvasX - offsetX) / scale;
    const logicalY = (canvasY - offsetY) / scale;
    
    return { 
      x: Math.max(0, Math.min(BASE_WIDTH, logicalX)), 
      y: Math.max(0, Math.min(BASE_HEIGHT, logicalY)) 
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSprayMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to logical coordinates
    const { x, y } = canvasToLogicalCoords(mouseX, mouseY, rect);
    
    const newPoints = [...points];
    const radius = (sprayRadius / 100) * 100; // Convert percentage to pixels
    
    for (let i = 0; i < sprayDensity / 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      // Ensure point is within canvas bounds
      if (px >= 0 && px <= BASE_WIDTH && py >= 0 && py <= BASE_HEIGHT) {
        newPoints.push({
          x: px,
          y: py,
          cluster: -1
        });
      }
    }
    
    setPoints(newPoints);
    setLastSprayPos({ x, y });
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSprayMode || !e.buttons) return;
    handleCanvasClick(e);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSprayMode) return;
    e.preventDefault(); // Prevent scrolling
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Convert to logical coordinates
    const { x, y } = canvasToLogicalCoords(touchX, touchY, rect);
    
    const newPoints = [...points];
    const radius = (sprayRadius / 100) * 100;
    
    for (let i = 0; i < sprayDensity / 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      // Ensure point is within canvas bounds
      if (px >= 0 && px <= BASE_WIDTH && py >= 0 && py <= BASE_HEIGHT) {
        newPoints.push({
          x: px,
          y: py,
          cluster: -1
        });
      }
    }
    
    setPoints(newPoints);
    setLastSprayPos({ x, y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSprayMode) return;
    e.preventDefault(); // Prevent scrolling
    handleTouchStart(e);
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
    
    // Calculate centering offset to keep everything in the middle
    const offsetX = (rect.width - BASE_WIDTH * scale) / 2;
    const offsetY = (rect.height - BASE_HEIGHT * scale) / 2;
    
    // Calculate appropriate point sizes based on scale
    const pointSize = Math.max(2, Math.min(3, 3 * scale));
    const centroidOuterSize = Math.max(4, Math.min(8, 8 * scale));
    const centroidInnerSize = Math.max(2, Math.min(3, 3 * scale));
    const lineWidth = Math.max(0.5, Math.min(1.5, 1.5 * scale));
    
    // Draw points with fixed scale
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(
        point.x * scale + offsetX, 
        point.y * scale + offsetY, 
        pointSize, 
        0, 
        Math.PI * 2
      );
      ctx.fillStyle = point.cluster >= 0 ? colors[point.cluster] : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = lineWidth * 0.5;
      ctx.stroke();
    });
    
    // Draw centroids with fixed scale
    centroids.forEach((centroid, idx) => {
      // Outer circle (filled)
      ctx.beginPath();
      ctx.arc(
        centroid.x * scale + offsetX, 
        centroid.y * scale + offsetY, 
        centroidOuterSize, 
        0, 
        Math.PI * 2
      );
      ctx.fillStyle = colors[idx];
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      
      // Inner circle (white dot for visibility)
      ctx.beginPath();
      ctx.arc(
        centroid.x * scale + offsetX, 
        centroid.y * scale + offsetY, 
        centroidInnerSize, 
        0, 
        Math.PI * 2
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
    
    // Draw spray preview
    if (isSprayMode && lastSprayPos) {
      ctx.beginPath();
      ctx.arc(
        lastSprayPos.x * scale + offsetX, 
        lastSprayPos.y * scale + offsetY, 
        (sprayRadius / 100) * 100 * scale, 
        0, 
        Math.PI * 2
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };

  useEffect(() => {
    initializePoints();
  }, [k]); // Re-initialize when k changes

  useEffect(() => {
    const resizeCanvas = () => {
      drawCanvas();
    };

    window.addEventListener('resize', resizeCanvas);
    drawCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [points, centroids, isSprayMode, lastSprayPos]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const animate = () => {
      if (isRunning) {
        assignClusters();
        updateCentroids();
        setIteration(prev => prev + 1);
        // Convert speed to delay: higher speed = lower delay
        const delay = Math.max(10, 1000 * (1 - animationSpeed / 100));
        timeoutId = setTimeout(animate, delay);
      }
    };

    if (isRunning) {
      const delay = Math.max(10, 1000 * (1 - animationSpeed / 100));
      timeoutId = setTimeout(animate, delay);
    }

    return () => clearTimeout(timeoutId);
  }, [isRunning, points, centroids, animationSpeed]);

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
            <span className="text-xl font-bold">AlgoViz</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col justify-center">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8    text-center bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text">
          K-Means Clustering Visualization
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
                  setIteration(0);
                  initializePoints();
                }}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              
              <div className="w-full text-center sm:text-left mt-2 sm:mt-0">
                Iteration: {iteration}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="min-w-[90px]">Clusters (K):</span>
                <div className="flex items-center gap-2 w-full">
                  <Slider
                    value={[k]}
                    onValueChange={(value) => setK(value[0])}
                    min={2}
                    max={9}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-4 text-right">{k}</span>
                </div>
              </div>
              
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

          {/* Controls - Spray section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="min-w-[110px]">Spray Density:</span>
                <div className="flex items-center gap-2 w-full">
                  <Slider
                    value={[sprayDensity]}
                    onValueChange={(value) => setSprayDensity(value[0])}
                    min={10}
                    max={200}
                    step={10}
                    className="flex-1"
                  />
                  <span className="w-8 text-right">{sprayDensity}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="min-w-[110px]">Spray Radius:</span>
                <div className="flex items-center gap-2 w-full">
                  <Slider
                    value={[sprayRadius]}
                    onValueChange={(value) => setSprayRadius(value[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-8 text-right">{sprayRadius}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Spray className="h-5 w-5" />
              <span>Spray Mode:</span>
              <Switch
                checked={isSprayMode}
                onCheckedChange={setIsSprayMode}
              />
            </div>
          </div>
          
          {/* Canvas - improved for mobile */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <div className="relative bg-black/50 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                <canvas
                  ref={canvasRef}
                  width={BASE_WIDTH}
                  height={BASE_HEIGHT}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4 sm:p-6 rounded-xl">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">How It Works</h2>
          <p className="text-gray-300 mb-4">
            K-means clustering is an unsupervised learning algorithm that groups similar data points together. The algorithm works by:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Randomly initializing K centroids</li>
            <li>Assigning each point to the nearest centroid</li>
            <li>Moving centroids to the average position of their assigned points</li>
            <li>Repeating steps 2-3 until convergence</li>
          </ol>
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Interactive Features</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Adjust animation speed to control the clustering process</li>
              <li>Use spray mode to add points by clicking and dragging</li>
              <li>Modify spray density and radius for different point distributions</li>
              <li>Change the number of clusters (K) to see different groupings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default KMeansVisualization;