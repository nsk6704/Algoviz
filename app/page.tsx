"use client";

import { useEffect, useState } from "react";
import { Brain, GitGraph, Target, ChevronRight, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AlgorithmItem {
  name: string;
  id: string;
  description: string;
}

interface AlgorithmCategory {
  category: string;
  icon: React.ReactNode;
  items: AlgorithmItem[];
}

// Define type for your component props
interface AlgorithmCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  id: string;
}

const algorithms: AlgorithmCategory[] = [
  {
    category: "Machine Learning",
    icon: <Brain className="w-6 h-6" />,
    items: [
      { name: "K-Means Clustering", id: "kmeans", description: "Interactive visualization of clustering algorithm with customizable parameters" },
      { name: "KNN Classification", id: "knn", description: "Visual demonstration of K-Nearest Neighbors with real-time classification" },
      { name: "Logistic Regression", id: "logistic", description: "Step-by-step visualization of binary classification" },
      { name: "Naive Bayes", id: "naive-bayes", description: "Interactive probability-based classification visualization" }
    ]
  },
  {
    category: "Artificial Intelligence",
    icon: <Cpu className="w-6 h-6" />,
    items: [
      { name: "A* Algorithm (8 Puzzle)", id: "astar", description: "Pathfinding visualization with heuristic search" },
      { name: "Minimax with α-β Pruning", id: "minimax", description: "Game tree visualization with pruning demonstration" },
      { name: "Hill Climb Search", id: "hillclimb", description: "Local search optimization visualization" },
      { name: "Tic Tac Toe", id: "tictactoe", description: "AI gameplay with decision tree visualization" }
    ]
  }
];

const BackgroundPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -top-250 -right-250 animate-pulse" />
    <div className="absolute w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl -bottom-250 -left-250 animate-pulse delay-1000" />
  </div>
);

const AlgorithmCard = ({ title, description, icon, id }: AlgorithmCardProps) => (
  <Link href={`/algorithms/${id}`}>
    <div className="relative group cursor-pointer">
      <div className="p-6 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:scale-105">
        <div className="flex items-center gap-4 mb-4">
          {icon}
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-400">{description}</p>
        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  </Link>
);

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundPattern />
      
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-black/50 backdrop-blur-lg shadow-lg" : ""
      )}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitGraph className="w-8 h-8 text-purple-500" />
            <span className="text-xl font-bold ">AlgoViz</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#machine-learning" className="text-gray-300 hover:text-white transition-colors">Machine Learning</a>
            <a href="#artificial-intelligence" className="text-gray-300 hover:text-white transition-colors">Artificial Intelligence</a>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text animate-text leading-tight leading-none">
              AlgoViz
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Interactive visualizations of popular Machine Learning and Artificial Intelligence algorithms. Learn through exploration and experimentation.
            </p>
          </div>

          {algorithms.map((category, idx) => (
            <section key={idx} className="mb-20" id={category.category.toLowerCase().replace(" ", "-")}>
              <div className="flex items-center gap-3 mb-8">
                {category.icon}
                <h2 className="text-3xl font-bold">{category.category}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {category.items.map((item, itemIdx) => (
                  <AlgorithmCard
                    key={itemIdx}
                    title={item.name}
                    description={item.description}
                    icon={<Target className="w-6 h-6 text-purple-500" />}
                    id={item.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}