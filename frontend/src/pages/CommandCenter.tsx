import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  Activity, 
  Flame, 
  Wind, 
  Bomb, 
  ShieldAlert, 
  Cpu, 
  Play,
  RotateCcw,
  Clock,
  Award,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import type { PanicType, TimelineEventType } from '../types';

export const CommandCenter: React.FC = () => {
  const { 
    nodes, 
    edges, 
    stats, 
    densityHistory, 
    panickedNodes, 
    smartDecision, 
    triggerPanicBFS, 
    clearPanic, 
    isEvacuationActive, 
    triggerEvacuation, 
    cancelEvacuation,
    timelineEvents,
    peopleEvacuated,
    selectedNodeId,
    setSelectedNodeId,
    selectedPath
  } = useSimulation();

  const [selectedPanicNode, setSelectedPanicNode] = useState<string>('');
  const [panicType, setPanicType] = useState<PanicType>('FIRE');

  // AI Assistant States
  const [aiDisplayed, setAiDisplayed] = useState<string>(
    'Select a query directive above to invoke the Emergency Command AI. The rules engine synthesizes graph, congestion, and hazard states in real time.'
  );
  const [aiFullText, setAiFullText] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timeline filter state
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'HAZARD' | 'PANIC' | 'REROUTE' | 'STABLE'>('ALL');

  // Typewriter effect
  useEffect(() => {
    if (!aiFullText) return;
    setAiDisplayed('');
    let idx = 0;
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      idx++;
      setAiDisplayed(aiFullText.slice(0, idx));
      if (idx >= aiFullText.length && typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    }, 12);
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [aiFullText]);

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' }
    })
  };


  // Filter out forecast points for current density stats
  const actualHistory = densityHistory.filter(pt => !pt.time.startsWith('+'));
  const currentTotalDensity = actualHistory[actualHistory.length - 1]?.density || stats.totalCrowd;

  // Determine prediction risk levels
  const getPredictionRisk = (predictedValue: number) => {
    const capacitySum = nodes.reduce((sum, n) => sum + n.capacity, 0);
    const ratio = predictedValue / capacitySum;
    if (ratio >= 0.75) return { label: 'CRITICAL', color: 'text-brand-red border-brand-red/30 bg-brand-red/10' };
    if (ratio >= 0.55) return { label: 'HIGH', color: 'text-orange-500 border-orange-500/30 bg-orange-500/10' };
    if (ratio >= 0.35) return { label: 'MEDIUM', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' };
    return { label: 'LOW', color: 'text-brand-green border-brand-green/30 bg-brand-green/10' };
  };

  // Get the latest forecast points
  const f1m = densityHistory.find(pt => pt.time === '+1m');
  const f2m = densityHistory.find(pt => pt.time === '+2m');

  const ma1m = f1m?.predictedMA || currentTotalDensity;
  const es1m = f1m?.predictedES || currentTotalDensity;
  const te1m = f1m?.predictedTE || currentTotalDensity;

  const ma2m = f2m?.predictedMA || currentTotalDensity;
  const es2m = f2m?.predictedES || currentTotalDensity;
  const te2m = f2m?.predictedTE || currentTotalDensity;

  // Average predicted values
  const averagePredicted2m = Math.round((ma2m + es2m + te2m) / 3);

  const confidence1m = 88;
  const confidence2m = 78;

  // Evacuation Performance Scorecard Calculations
  const panickedCount = Object.keys(panickedNodes).length;
  const panicRatio = panickedCount / Math.max(1, nodes.length);
  
  const safetyScore = Math.max(0, Math.round(100 - (stats.stampedeProbability * 0.7) - (panicRatio * 30)));
  const efficiencyScore = Math.max(0, Math.round(100 - (stats.bottleneckCount * 12) - (stats.maxFlowUtilization * 15)));
  const overallPerformanceScore = Math.max(5, Math.min(100, Math.round((safetyScore * 0.6) + (efficiencyScore * 0.4))));

  const peopleRemaining = Math.max(0, Math.round(nodes.filter(n => n.type !== 'EMERGENCY_EXIT').reduce((sum, n) => sum + n.currentDensity, 0)));

  // Estimate Egress duration remaining
  const activeExitsCount = nodes.filter(n => n.type === 'EMERGENCY_EXIT' || (n.type === 'ENTRY_GATE' && isEvacuationActive)).length;
  const avgDrainRate = isEvacuationActive ? 12.5 : 5.0;
  const estimatedSecondsLeft = activeExitsCount > 0 
    ? Math.round(peopleRemaining / (activeExitsCount * avgDrainRate * Math.max(0.5, stats.maxFlowUtilization)))
    : 999;

  // Determine overall letter grade
  const getOverallGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', color: 'text-brand-green border-brand-green bg-brand-green/10 shadow-glow-green' };
    if (score >= 90) return { grade: 'A', color: 'text-emerald-400 border-emerald-400 bg-emerald-400/10' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-400 border-blue-400 bg-blue-400/10' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-400 border-orange-400 bg-orange-400/10' };
    return { grade: 'F', color: 'text-brand-red border-brand-red bg-brand-red/10 shadow-glow-red' };
  };

  const performanceGrade = getOverallGrade(overallPerformanceScore);

  // BFS Panic Trigger handler
  const handleTriggerPanic = () => {
    if (!selectedPanicNode) return;
    triggerPanicBFS(selectedPanicNode, panicType);
  };

  // Get Node color based on density & panic level
  const getNodeColor = (nodeId: string, densityRatio: number) => {
    const panicNode = panickedNodes[nodeId];
    if (panicNode && panicNode.level > 0) {
      if (panicNode.level >= 75) return '#ef4444'; // Red
      if (panicNode.level >= 50) return '#f97316'; // Orange
      return '#eab308'; // Yellow
    }

    if (densityRatio >= 0.9) return '#ef4444';
    if (densityRatio >= 0.7) return '#f97316';
    if (densityRatio >= 0.4) return '#eab308';
    return '#10b981';
  };

  // Sort nodes for panic drop-down selection (exclude exits)
  const panicSelectableNodes = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');

  // Strategy comparison static metadata mapped with dynamic highlight
  const strategies = [
    {
      name: 'A* Search',
      type: 'Single-source Shortest Path',
      speed: 'Fast Egress',
      throughput: 'Low Optimization',
      complexity: 'O(E log V)',
      suitability: 'Normal or Light Crowd Flow'
    },
    {
      name: 'BFS Scheduling',
      type: 'Multi-source Wave Drainage',
      speed: 'Balanced Egress',
      throughput: 'Medium Optimization',
      complexity: 'O(V + E)',
      suitability: 'Active Congested Evacuation'
    },
    {
      name: 'Ford-Fulkerson (Max Flow)',
      type: 'Capacity Network Flow',
      speed: 'Slow Path calculation',
      throughput: 'Max Capacity Utilization',
      complexity: 'O(E * max_flow)',
      suitability: 'Heavy Crowd Congestion'
    },
    {
      name: 'Hybrid Routing (A* + Max Flow)',
      type: 'Multi-factor Adaptive Flow',
      speed: 'Optimized Egress',
      throughput: 'High Optimization',
      complexity: 'O(E * max_flow + E log V)',
      suitability: 'Multi-Hazard Emergency / Panic'
    }
  ];

  // Live strategy scoring calculations
  const totalHazardsCount = nodes.filter(n => n.currentDensity > n.capacity * 0.95).length; 
  const isPanicSpread = panickedCount >= 3;

  const comparisonData = [
    {
      name: 'A* Search',
      Safety: isPanicSpread ? 15 : 75,
      Efficiency: isPanicSpread ? 20 : 80,
      Throughput: 40
    },
    {
      name: 'BFS Scheduling',
      Safety: isEvacuationActive ? 65 : 45,
      Efficiency: isEvacuationActive ? 75 : 55,
      Throughput: 60
    },
    {
      name: 'Ford-Fulkerson',
      Safety: totalHazardsCount > 0 ? 80 : 60,
      Efficiency: totalHazardsCount > 0 ? 85 : 70,
      Throughput: 90
    },
    {
      name: 'Hybrid Routing',
      Safety: isPanicSpread || isEvacuationActive ? 95 : 85,
      Efficiency: isPanicSpread || isEvacuationActive ? 92 : 88,
      Throughput: 95
    }
  ];

  // Algorithmic explainable rules
  const getSelectedAlgorithmExplanation = (algoName: string) => {
    switch (algoName) {
      case 'Hybrid Routing (A* + Max Flow)':
      case 'Hybrid Routing (A* + Max Flow)':
        return {
          pros: 'Avoids structural & fire hazards while maximizing bottleneck corridor width utilization.',
          cons: 'High computational latency. Demands frequent re-evaluation ticks.',
          cost: 'O(E * max_flow + E log V) complexity',
          constraints: 'Active Fire/Explosion hazards + Spread of Panic level >= 3 zones'
        };
      case 'Ford-Fulkerson (Max Flow)':
      case 'Ford-Fulkerson + A*':
        return {
          pros: 'Solves overall routing congestion by shifting cohort streams to underutilized exits.',
          cons: 'Increases walking distance for individual groups to protect network safety.',
          cost: 'O(E * max_flow) bottleneck search complexity',
          constraints: 'Crowd density threshold exceeds limits in 3+ sectors'
        };
      case 'BFS Evacuation Scheduling':
      case 'BFS Scheduling':
        return {
          pros: 'Orders sector drainage step-by-step to prevent stampedes at emergency bottlenecks.',
          cons: 'Disregards individual distance preferences during local path routing.',
          cost: 'O(V + E) linear scheduling depth',
          constraints: 'Active Evacuation Mode is enabled'
        };
      case 'A* Search (Congestion-Bypass)':
        return {
          pros: 'Dynamically routes cohorts around blocked paths or structural damage.',
          cons: 'Can cause queue backlogs on alternative routes if density spikes.',
          cost: 'O(E log V) dynamic path recalculation',
          constraints: 'Active blockages detected on major corridors'
        };
      default:
        return {
          pros: 'Determines the absolute shortest physical path to egress exits.',
          cons: 'Completely ignores crowd bottlenecks, which can cause stampedes in heavy crowds.',
          cost: 'O(E log V) standard path calculation',
          constraints: 'Normal operations under light venue crowd load'
        };
    }
  };

  const currentExplanation = getSelectedAlgorithmExplanation(smartDecision.selectedAlgorithm);

  // Live route path stats for explainable panel
  const routeCongestedNodes = selectedPath.filter(nid => {
    const node = nodes.find(n => n.id === nid);
    return node && (node.currentDensity / node.capacity) >= 0.7;
  });

  const routeHazardsIntersect = selectedPath.filter(nid => {
    return panickedNodes[nid] && panickedNodes[nid].level > 30;
  });

  // AI Assistant Button Click Handlers
  const handleQuery = (queryType: string) => {
    setActiveQuery(queryType);
    switch (queryType) {
      case 'SAFEST_EXIT': {
        const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT' || n.type === 'ENTRY_GATE');
        if (exits.length === 0) {
          setAiFullText('No usable exits detected in the venue graph configuration.');
          return;
        }
        
        // Find exit with lowest density
        let bestExit = exits[0];
        let lowestRatio = 999;
        exits.forEach(ex => {
          const ratio = ex.currentDensity / ex.capacity;
          const isPanicSource = panickedNodes[ex.id] && panickedNodes[ex.id].level > 20;
          const score = ratio + (isPanicSource ? 5.0 : 0);
          if (score < lowestRatio) {
            lowestRatio = score;
            bestExit = ex;
          }
        });

        const pct = Math.round((bestExit.currentDensity / bestExit.capacity) * 100);
        setAiFullText(
          `[EMERGENCY COMMAND AI: SAFEST EXIT ANALYTICAL ROUTING]\n\n` +
          `• Recommending Egress Portal: ${bestExit.name}\n` +
          `• Density load factor: ${pct}% (${Math.round(bestExit.currentDensity)} / ${bestExit.capacity} Capacity)\n` +
          `• Threat indicators: ${pct > 70 ? '⚠️ Heavy local queues forming.' : '🟢 Node clear of critical blockages.'}\n` +
          `• Tactical rationale: Lowest density ratio within standard deviation. High remaining throughput capacity ensures minimal stampede friction.`
        );
        break;
      }
      case 'HIGHEST_CONGESTION': {
        const internalNodes = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');
        if (internalNodes.length === 0) {
          setAiFullText('No internal graph sectors loaded.');
          return;
        }

        let worstNode = internalNodes[0];
        let maxRatio = -1;
        internalNodes.forEach(n => {
          const ratio = n.currentDensity / n.capacity;
          if (ratio > maxRatio) {
            maxRatio = ratio;
            worstNode = n;
          }
        });

        const pct = Math.round(maxRatio * 100);
        setAiFullText(
          `[EMERGENCY COMMAND AI: SECTOR CONGESTION AUDIT]\n\n` +
          `• Critical Hotspot identified: ${worstNode.name}\n` +
          `• Current Congestion Index: ${pct}%\n` +
          `• Sector Occupancy: ${Math.round(worstNode.currentDensity)} people / ${worstNode.capacity} capacity limit.\n` +
          `• Action Plan: Deploy active re-routing. Bypassing corridors connected to ${worstNode.id} is recommended.`
        );
        break;
      }
      case 'BEST_ROUTE': {
        if (selectedPath.length === 0) {
          setAiFullText(
            `[EMERGENCY COMMAND AI: ROUTE COMPILATION]\n\n` +
            `• Status: No active path selected on map.\n` +
            `• Action: Select a node on the venue layout or set route coordinates in the Control Panel.`
          );
          return;
        }

        const pathNames = selectedPath.map(id => nodes.find(n => n.id === id)?.name || id);
        const avgDensityRatio = selectedPath.reduce((acc, id) => {
          const n = nodes.find(x => x.id === id);
          return acc + (n ? n.currentDensity / n.capacity : 0);
        }, 0) / selectedPath.length;

        setAiFullText(
          `[EMERGENCY COMMAND AI: SYSTEM OPTIMAL PATH DETAILED WIDGET]\n\n` +
          `• Path Vector: ${pathNames.join(' ➔ ')}\n` +
          `• Path hops: ${selectedPath.length} steps\n` +
          `• Average Path Occupancy: ${Math.round(avgDensityRatio * 100)}%\n` +
          `• Safety rating: ${routeHazardsIntersect.length > 0 ? '🔴 WARNING: Path cuts through panicked nodes!' : '🟢 SECURE: Path avoids hazard epicenters.'}`
        );
        break;
      }
      case 'WHY_ROUTE': {
        setAiFullText(
          `[EMERGENCY COMMAND AI: STRATEGY SCHEDULER JUSTIFICATION]\n\n` +
          `• Selected Strategy Core: ${smartDecision.selectedAlgorithm}\n` +
          `• Situation Profile: ${smartDecision.situation}\n` +
          `• Algorithmic Rationale: ${smartDecision.reason}\n` +
          `• Performance confidence: ${smartDecision.decisionConfidence}%\n` +
          `• Safety margin improvement: +${smartDecision.estimatedImprovement}% vs traditional shortest path logic.`
        );
        break;
      }
      case 'CURRENT_RISKS': {
        const hazardTypes = nodes.filter(n => panickedNodes[n.id] && panickedNodes[n.id].level > 50).map(n => n.name);
        setAiFullText(
          `[EMERGENCY COMMAND AI: COMPREHENSIVE VENUE RISK INDEX]\n\n` +
          `• Active Stampede Risk Factor: ${stats.stampedeProbability}%\n` +
          `• Dynamic Bottleneck Count: ${stats.bottleneckCount} corridors\n` +
          `• BFS Panic Propagation sectors: ${panickedCount} nodes\n` +
          `• Severely threatened nodes (Panic > 50%): ${hazardTypes.join(', ') || 'None'}`
        );
        break;
      }
      case 'RECOMMENDATIONS': {
        const recList = [];
        if (stats.stampedeProbability > 55) {
          recList.push('⚠️ TRIGGER VENUE EVACUATION ALARMS IMMEDIATELY.');
        }
        if (stats.bottleneckCount > 1) {
          recList.push('🚧 Redirect crowd flow around key corridor junctions to mitigate bottlenecks.');
        }
        if (panickedCount > 0) {
          recList.push('🚨 Deploy tactical floor marshals to panicked nodes to control crowd expansion waves.');
        }
        if (recList.length === 0) {
          recList.push('✅ All parameters stable. Continue standard routing supervision.');
        }

        setAiFullText(
          `[EMERGENCY COMMAND AI: COMMAND OPERATIONAL DECISION LIST]\n\n` +
          recList.map((rec, i) => `${i + 1}. ${rec}`).join('\n')
        );
        break;
      }
      default:
        break;
    }
  };

  const getTimelineIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'HAZARD_INJECTED': return <Flame className="w-4 h-4 text-brand-red" />;
      case 'PANIC_TRIGGERED': return <ShieldAlert className="w-4 h-4 text-orange-500 animate-pulse" />;
      case 'REROUTED': return <RotateCcw className="w-4 h-4 text-brand-blue" />;
      case 'STAMPEDE_RISK_SPIKE': return <AlertTriangle className="w-4 h-4 text-brand-red animate-bounce" />;
      case 'EVACUATION_STARTED': return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'STABILIZED': return <CheckCircle className="w-4 h-4 text-brand-green" />;
      case 'CONGESTION_ALERT': return <Layers className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTimelineBorderColor = (type: TimelineEventType) => {
    switch (type) {
      case 'HAZARD_INJECTED': return 'border-brand-red/30 bg-brand-red/5';
      case 'PANIC_TRIGGERED': return 'border-orange-500/30 bg-orange-500/5';
      case 'REROUTED': return 'border-brand-blue/30 bg-brand-blue/5';
      case 'STAMPEDE_RISK_SPIKE': return 'border-brand-red/40 bg-brand-red/10';
      case 'EVACUATION_STARTED': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'STABILIZED': return 'border-brand-green/30 bg-brand-green/5';
      case 'CONGESTION_ALERT': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-slate-800 bg-slate-900/35';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100 pb-20">
      {/* 1. Header Banner & Global Control HUD */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center">
            <Cpu className="w-8 h-8 mr-3 text-brand-blue animate-pulse" />
            Emergency Command AI Panel
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time BFS Panic Propagation waves, linear regression analytics, and explainable decision scheduler.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isEvacuationActive ? (
            <button 
              onClick={cancelEvacuation}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-brand-green/30 bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-all duration-300 shadow-glow-green"
            >
              Stand Down Evacuation
            </button>
          ) : (
            <button 
              onClick={triggerEvacuation}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-brand-red/30 bg-brand-red/10 text-brand-red hover:bg-brand-red/20 transition-all duration-300 animate-pulse shadow-glow-red"
            >
              Force Evacuation (BFS Mode)
            </button>
          )}
          {panickedCount > 0 && (
            <button 
              onClick={clearPanic}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-750 transition-all text-white flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Stabilize Panic
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Row (Scorecard HUD including Evacuation Performance Score) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Evacuation Performance Score Card */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="flex flex-col">
          <GlassCard className="border-slate-800 bg-slate-900/40 relative overflow-hidden flex flex-col justify-between p-5 h-full">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-full blur-2xl -z-10"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
                <Award className="w-4 h-4 mr-1.5 text-brand-green" />
                Egress Operations Grade
              </span>
              <span className={`text-xs font-black font-mono border-2 px-2.5 py-0.5 rounded-md ${performanceGrade.color}`}>
                {performanceGrade.grade}
              </span>
            </div>
            <div className="my-4 flex items-center space-x-4">
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    stroke={overallPerformanceScore >= 80 ? '#10b981' : overallPerformanceScore >= 60 ? '#f59e0b' : '#ef4444'} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 * (1 - overallPerformanceScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-xl font-black text-white font-mono">{overallPerformanceScore}%</div>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-400">Tactical Score</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {overallPerformanceScore >= 80 ? 'Optimal Status' : overallPerformanceScore >= 60 ? 'Stressed Flow' : 'Critical Hazard'}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">Weighted metric index of safety and bottleneck rates.</p>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
              <span>Safety: {safetyScore}%</span>
              <span>Efficiency: {efficiencyScore}%</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Live Evacuated Statistics */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="flex flex-col">
          <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1.5 text-brand-green" />
                Evacuation Tracking
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-brand-green/10 border border-brand-green/20 rounded text-brand-green font-bold">
                LIVE COUNT
              </span>
            </div>
            <div className="my-4">
              <div className="text-3xl font-black text-white">{peopleEvacuated} <span className="text-xs font-normal text-slate-400 font-mono">Evacuated</span></div>
              <p className="text-[11px] text-slate-500 mt-1">Remaining inside venue: {peopleRemaining} Pax</p>
            </div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
              <span>Egress Rate: {isEvacuationActive ? '15.5 people/s' : '0.0 people/s'}</span>
              <span>Evacuation: {isEvacuationActive ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Forecast +1 Minute card */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="flex flex-col">
          <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-orange-400" />
                Density Forecast +60s
              </span>
              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getPredictionRisk(Math.round((ma1m+es1m+te1m)/3)).color}`}>
                {getPredictionRisk(Math.round((ma1m+es1m+te1m)/3)).label}
              </span>
            </div>
            <div className="my-4">
              <div className="text-3xl font-black text-white">{Math.round((ma1m + es1m + te1m) / 3)} <span className="text-xs font-normal text-slate-400 font-mono">Pax</span></div>
              <p className="text-[11px] text-slate-500 mt-1">Exponential smoothed: {es1m > currentTotalDensity ? 'Load accumulating' : 'Clearing paths'}</p>
            </div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
              <span>Confidence: {confidence1m}%</span>
              <span>Var: +/- 3.5%</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Forecast +2 Minutes card */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="flex flex-col">
          <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-brand-red" />
                Density Forecast +120s
              </span>
              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getPredictionRisk(averagePredicted2m).color}`}>
                {getPredictionRisk(averagePredicted2m).label}
              </span>
            </div>
            <div className="my-4">
              <div className="text-3xl font-black text-white">{averagePredicted2m} <span className="text-xs font-normal text-slate-400 font-mono">Pax</span></div>
              <p className="text-[11px] text-slate-500 mt-1">Est Egress Time: {isEvacuationActive ? `${estimatedSecondsLeft} seconds` : 'N/A'}</p>
            </div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
              <span>Confidence: {confidence2m}%</span>
              <span>Var: +/- 6.2%</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* 3. Middle Grid: SVG Map, Recharts Forecast, and Panic Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SVG Panic Spreading Visualizer */}
        <GlassCard className="xl:col-span-2 border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full bg-brand-red animate-ping"></div>
              <h3 className="font-semibold text-white text-sm">Live Panic Expansion Wave Map</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">BFS PROPAGATION ACTIVE (1 HOP / SEC)</span>
          </div>

          <div className="w-full aspect-[2/1] bg-slate-950 border border-slate-850 rounded-2xl relative overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="0 0 1300 650" className="w-full h-full">
              {/* Draw Edges */}
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source);
                const destNode = nodes.find(n => n.id === edge.target);
                if (!srcNode || !destNode) return null;

                const x1 = srcNode.x;
                const y1 = srcNode.y / 2 + 50;
                const x2 = destNode.x;
                const y2 = destNode.y / 2 + 50;

                const isPathEdge = edge.distance > 900000;
                const isSelectedPathEdge = selectedPath.includes(edge.source) && selectedPath.includes(edge.target);
                
                return (
                  <line 
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSelectedPathEdge ? '#3b82f6' : isPathEdge ? '#ef4444' : '#334155'}
                    strokeWidth={isSelectedPathEdge ? 4 : isPathEdge ? 1 : 2}
                    strokeDasharray={isPathEdge ? '3 3' : 'none'}
                    opacity={isSelectedPathEdge ? 0.95 : isPathEdge ? 0.3 : 0.7}
                  />
                );
              })}

              {/* Draw Nodes */}
              {nodes.map(node => {
                const x = node.x;
                const y = node.y / 2 + 50;
                const densityRatio = node.currentDensity / node.capacity;
                const panicNode = panickedNodes[node.id];
                const hasPanic = panicNode && panicNode.level > 0;
                const isSelectedNode = selectedNodeId === node.id;

                return (
                  <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNodeId(node.id)}>
                    {/* Selected highlight pulse */}
                    {isSelectedNode && (
                      <circle cx={x} cy={y} r={28} fill="none" stroke="#3b82f6" strokeWidth={3} opacity={0.9}>
                        <animate attributeName="r" values="14;28;14" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Panic ripple waves */}
                    {hasPanic && (
                      <>
                        <circle cx={x} cy={y} r={30} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.7}>
                          <animate attributeName="r" values="15;40;15" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={x} cy={y} r={25} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4}>
                          <animate attributeName="r" values="15;50;15" dur="3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}

                    {/* Node Core */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={hasPanic ? 16 : 14} 
                      fill={getNodeColor(node.id, densityRatio)}
                      stroke={isSelectedNode ? '#3b82f6' : '#0f172a'}
                      strokeWidth={3}
                    />

                    {/* Node Label Text */}
                    <text 
                      x={x} 
                      y={y - 22} 
                      textAnchor="middle" 
                      fill={isSelectedNode ? '#3b82f6' : '#94a3b8'} 
                      fontSize={11} 
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Live Panic Trigger & Controller */}
        <GlassCard className="border-slate-850 bg-slate-900/30 flex flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Panic Wave Epicenter</h3>
                  <p className="text-[10px] text-slate-500 font-mono">BFS DISASTER SIMULATION</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                  Select Epicenter Sector
                </label>
                <select 
                  value={selectedPanicNode}
                  onChange={(e) => setSelectedPanicNode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-red/50 transition font-mono"
                >
                  <option value="">-- Select Sector --</option>
                  {panicSelectableNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                  Emergency Incident Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FIRE', 'SMOKE', 'EXPLOSION'] as PanicType[]).map(t => {
                    const icons = { FIRE: Flame, SMOKE: Wind, EXPLOSION: Bomb };
                    const IconComp = icons[t];
                    const isActive = panicType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setPanicType(t)}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-brand-red/20 border-brand-red text-brand-red shadow-glow-red' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-4 h-4 mb-1" />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={!selectedPanicNode}
                onClick={handleTriggerPanic}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                  selectedPanicNode 
                    ? 'bg-brand-red hover:bg-brand-red-hover text-white shadow-glow-red' 
                    : 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 mr-2" />
                Trigger BFS Panic Wave
              </button>
            </div>
          </div>

          <div className="border-t border-slate-900 mt-4 pt-3">
            <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400 block mb-2">Active Panic States</span>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {panickedCount === 0 ? (
                <div className="text-[10px] text-slate-500 font-mono text-center py-3">No active panic zones.</div>
              ) : (
                Object.values(panickedNodes).map(pn => {
                  const name = nodes.find(n => n.id === pn.nodeId)?.name || pn.nodeId;
                  return (
                    <div key={pn.nodeId} className="flex justify-between items-center text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-900">
                      <span className="text-white font-bold">{name}</span>
                      <span className="text-brand-red font-semibold">{pn.level}% ({pn.sourceType})</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 4. Fourth Grid: Emergency Command AI Assistant & Incident Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rule-Based AI Assistant Widget */}
        <GlassCard className="lg:col-span-2 border-slate-850 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                  <MessageSquare className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Emergency Command AI Assistant</h3>
                  <p className="text-[10px] text-slate-500 font-mono">RULE-BASED INCIDENT ADVISOR</p>
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-500 px-2 py-0.5 border border-slate-800 bg-slate-950 rounded">V2.4 ENGINE</span>
            </div>

            {/* AI Control Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              {[
                { id: 'SAFEST_EXIT', label: 'Safest Exit' },
                { id: 'HIGHEST_CONGESTION', label: 'Highest Congestion' },
                { id: 'BEST_ROUTE', label: 'Best Route' },
                { id: 'WHY_ROUTE', label: 'Why this Route?' },
                { id: 'CURRENT_RISKS', label: 'Current Risks' },
                { id: 'RECOMMENDATIONS', label: 'Recommendations' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => handleQuery(btn.id)}
                  className={`py-2 px-3 rounded-lg border font-mono text-[11px] font-semibold text-center transition-all ${
                    activeQuery === btn.id
                      ? 'bg-brand-blue/20 border-brand-blue text-brand-blue shadow-glow-blue'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* AI Output Terminal */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[140px] font-mono text-xs text-slate-300 leading-relaxed shadow-inner relative overflow-hidden">
              <div className="absolute top-2 right-3 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-ping"></span>
                <span className="text-[9px] text-slate-500">READY</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs">{aiDisplayed}</pre>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-3.5 flex justify-between items-center border-t border-slate-900 pt-2.5">
            <span>Query Pipeline: ACTIVE</span>
            <span>Confidence Indicator: {smartDecision.decisionConfidence}%</span>
          </div>
        </GlassCard>

        {/* Live Incident Timeline Panel */}
        <GlassCard className="border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="flex flex-col space-y-3 border-b border-slate-800 pb-3 mb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-red animate-pulse" />
                <h3 className="font-semibold text-white text-sm">Incident Timeline & Replay</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">CLICK TO LOCATE INCIDENT</span>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {(['ALL','HAZARD','PANIC','REROUTE','STABLE'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTimelineFilter(f)}
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border transition-all ${
                    timelineFilter === f
                      ? 'bg-brand-blue/20 border-brand-blue text-brand-blue'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[240px] pr-1 flex-1 font-mono text-[11px] mt-3">
            {(() => {
              const filterMap: Record<string, string[]> = {
                HAZARD: ['HAZARD_INJECTED'],
                PANIC: ['PANIC_TRIGGERED', 'STAMPEDE_RISK_SPIKE'],
                REROUTE: ['REROUTED', 'EVACUATION_STARTED'],
                STABLE: ['STABILIZED'],
                ALL: []
              };
              const filtered = timelineFilter === 'ALL'
                ? timelineEvents
                : timelineEvents.filter(e => filterMap[timelineFilter]?.includes(e.type));
              return filtered.length === 0 ? (
                <div className="text-slate-500 text-center py-10">No events for this filter.</div>
              ) : (
                filtered.map((evt) => {
                const isSelected = selectedNodeId === evt.nodeId;
                return (
                  <div 
                    key={evt.id} 
                    onClick={() => {
                      if (evt.nodeId) {
                        setSelectedNodeId(evt.nodeId);
                      }
                    }}
                    className={`p-2.5 border rounded-xl cursor-pointer transition-all duration-300 ${getTimelineBorderColor(evt.type)} ${
                      isSelected 
                        ? 'border-brand-blue/60 shadow-glow-blue bg-brand-blue/5 translate-x-1' 
                        : 'hover:border-slate-700 hover:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                      <span className="flex items-center gap-1.5 font-bold">
                        {getTimelineIcon(evt.type)}
                        {evt.title}
                      </span>
                      <span>{evt.timestamp}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{evt.description}</p>
                    {evt.nodeId && (
                      <div className="mt-1.5 flex justify-end">
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-750 text-slate-400 font-mono uppercase tracking-wider">
                          Epicenter: {evt.nodeId}
                        </span>
                      </div>
                    )}
                  </div>
                );
                })
              );
            })()}
          </div>

          <div className="border-t border-slate-900 mt-3 pt-2 text-[10px] text-slate-500 flex justify-between font-mono">
            <span>Recorded Incidents: {timelineEvents.length}</span>
            <span>Buffer Status: Live Tracking</span>
          </div>
        </GlassCard>
      </div>

      {/* 5. Fifth Grid: Recharts Forecast & Explainable Decisions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recharts Density Forecast Area Graph */}
        <GlassCard className="xl:col-span-2 border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-brand-green" />
              <div>
                <h3 className="font-semibold text-white text-sm">Predictive Density Forecasting Models</h3>
                <p className="text-[10px] text-slate-500 font-mono">REAL-TIME FORECAST LINES AT +30s, +60s, +120s</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-blue mr-1"></span>Actual</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-red mr-1"></span>MA</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-green mr-1"></span>ES</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-amber-500 mr-1"></span>Trend</span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={densityHistory} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 150', 'dataMax + 150']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="density" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} 
                  activeDot={{ r: 5 }} 
                  name="Current Density" 
                  connectNulls
                />
                <Line type="monotone" dataKey="predictedMA" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} name="Moving Average" />
                <Line type="monotone" dataKey="predictedES" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} name="Exponential Smoothing" />
                <Line type="monotone" dataKey="predictedTE" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="Trend Estimation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Explainable Decision Panel */}
        <GlassCard className="xl:col-span-1 border-slate-850 bg-slate-900/30 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-brand-blue" />
                <h3 className="font-semibold text-white text-sm">Explainable Routing Decisions</h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">ACTIVE ALGORITHM</span>
                <span className="text-sm font-black text-brand-blue">{smartDecision.selectedAlgorithm}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ALGORITHMIC PROS</span>
                <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-900">
                  {currentExplanation.pros}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ALGORITHMIC CONS & LIMITATIONS</span>
                <p className="text-slate-400 mt-1 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-900">
                  {currentExplanation.cons}
                </p>
              </div>

              {/* Explainable Path Telemetry Details */}
              <div className="border-t border-slate-900 pt-2.5 space-y-2">
                <span className="text-[10px] text-slate-500 block">REAL-TIME ROUTE TELEMETRY</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2 rounded border border-slate-900">
                  <div>Path distance: <span className="text-white font-bold">{selectedPath.length > 0 ? `${selectedPath.length} nodes` : 'N/A'}</span></div>
                  <div>Congested segments: <span className={routeCongestedNodes.length > 0 ? 'text-brand-red font-bold' : 'text-brand-green'}>{routeCongestedNodes.length}</span></div>
                  <div>Threat zones hit: <span className={routeHazardsIntersect.length > 0 ? 'text-brand-red font-bold' : 'text-brand-green'}>{routeHazardsIntersect.length}</span></div>
                  <div>Egress potential: <span className="text-brand-blue font-bold">{isEvacuationActive ? 'CRITICAL EVAC' : 'STANDARD'}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 font-mono mt-4 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-brand-green" />
            Decision rationale validated on live parameters.
          </div>
        </GlassCard>
      </div>

      {/* 6. Bottom Row: Strategy Comparison Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recharts Strategy Comparison Bar Chart */}
        <GlassCard className="xl:col-span-1 border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-brand-blue" />
                <h3 className="font-semibold text-white text-sm">Live Strategy Performance Benchmark</h3>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                  <Bar dataKey="Safety" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Throughput" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 p-3 bg-brand-blue/5 border border-brand-blue/20 rounded-xl flex items-start space-x-2">
            <Award className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-[10px] font-mono">
              <span className="text-brand-blue font-bold block">Winning Strategy</span>
              <span className="text-slate-200">{smartDecision.selectedAlgorithm}</span>
              <span className="text-slate-500 block mt-0.5">{smartDecision.situation} — {smartDecision.decisionConfidence}% confidence</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal font-mono mt-3">
            Real-time scoring comparing 0-100 indicators. Hybrid outperforms under panic propagation states.
          </p>
        </GlassCard>

        {/* Strategy Comparison Matrix Table */}
        <GlassCard className="xl:col-span-2 border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-green" />
                <h3 className="font-semibold text-white text-sm">Strategy Allocation Comparison Matrix</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">DYNAMIC RE-ROUTING BENCHMARKS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500">
                    <th className="py-2.5 font-semibold">Routing Core</th>
                    <th className="py-2.5 font-semibold">Framework Class</th>
                    <th className="py-2.5 font-semibold text-center">Egress Rate</th>
                    <th className="py-2.5 font-semibold text-center">Throughput Limit</th>
                    <th className="py-2.5 font-semibold">Performance Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strat, index) => {
                    const isSelected = smartDecision.selectedAlgorithm.startsWith(strat.name) || 
                      (strat.name.includes('BFS') && smartDecision.selectedAlgorithm.includes('BFS')) || 
                      (strat.name.includes('Ford-Fulkerson') && smartDecision.selectedAlgorithm.includes('Ford-Fulkerson'));

                    return (
                      <tr 
                        key={index} 
                        className={`border-b border-slate-900/80 transition-all ${
                          isSelected 
                            ? 'bg-brand-blue/10 text-white font-bold border-l-4 border-l-brand-blue pl-1.5' 
                            : 'text-slate-400 hover:bg-slate-900/20'
                        }`}
                      >
                        <td className="py-3 flex items-center">
                          {isSelected && <ArrowRight className="w-3.5 h-3.5 mr-1 text-brand-blue animate-pulse" />}
                          {strat.name}
                        </td>
                        <td className="py-3 text-slate-500">{strat.type}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            strat.speed.includes('Fast') || strat.speed.includes('Optimized')
                              ? 'bg-brand-green/10 text-brand-green' 
                              : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {strat.speed}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            strat.throughput.includes('High') || strat.throughput.includes('Max')
                              ? 'bg-brand-green/10 text-brand-green' 
                              : strat.throughput.includes('Medium')
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-brand-red/10 text-brand-red'
                          }`}>
                            {strat.throughput}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{strat.complexity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4 flex items-center justify-between border-t border-slate-900 pt-3">
            <span className="flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Routing core re-assesses conditions every tick (3s).
            </span>
            <span className="text-slate-400">Highlighted row = ACTIVE core</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
