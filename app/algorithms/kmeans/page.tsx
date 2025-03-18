"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Play, Pause, SprayCan as Spray } from "lucide-react";

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
  const [isSprayMode, setIsSprayMode] = useState(false);
  const [lastSprayPos, setLastSprayPos] = useState<{ x: number; y: number } | null>(null);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEEAD', '#D4A5A5',
    '#9B59B6', '#3498DB', '#F1C40F'
  ];

  const generateRandomPoints = (count: number) => {
    const newPoints: Point[] = [];
    for (let i = 0; i < count; i++) {
      newPoints.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
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
    for (let i = 0; i < k; i++) {
      newCentroids.push({
        x: Math.random() * 800,
        y: Math.random() * 600
      });
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSprayMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    const newPoints = [...points];
    const radius = (sprayRadius / 100) * 100; // Convert percentage to pixels
    
    for (let i = 0; i < sprayDensity / 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      newPoints.push({
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
        cluster: -1
      });
    }
    
    setPoints(newPoints);
    setLastSprayPos({ x, y });
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSprayMode || !e.buttons) return;
    handleCanvasClick(e);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Ensure the canvas is properly sized with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }

    // Disable smoothing for crisp rendering
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw points with crisp edges
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = point.cluster >= 0 ? colors[point.cluster] : '#ffffff';
      ctx.fill();
      // Add a subtle border for better definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw centroids with sharp edges
    centroids.forEach((centroid, idx) => {
      // Outer circle (filled)
      ctx.beginPath();
      ctx.arc(centroid.x, centroid.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = colors[idx];
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Inner circle (white dot for visibility)
      ctx.beginPath();
      ctx.arc(centroid.x, centroid.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Draw spray preview if in spray mode
    if (isSprayMode && lastSprayPos) {
      ctx.beginPath();
      ctx.arc(lastSprayPos.x, lastSprayPos.y, (sprayRadius / 100) * 100, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col justify-center">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">
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
          
          {/* Canvas - centered with max width */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="bg-black/50 rounded-lg w-full cursor-crosshair"
                style={{ aspectRatio: '4/3' }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
              />
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
  );
};

export default KMeansVisualization;