import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { VenueNode, VenueEdge, LogEntry, AlgorithmStep, SimulationStats } from '../types';
import { findSafestPathAStar, computeMaxFlow, runTopologicalSort } from '../utils/algorithms';

interface SimulationContextProps {
  nodes: VenueNode[];
  edges: VenueEdge[];
  logs: LogEntry[];
  isRunning: boolean;
  isEvacuationActive: boolean;
  simulationSpeed: number;
  crowdSizeMultiplier: number;
  densityThreshold: number;
  activeAlgorithm: AlgorithmStep | null;
  selectedNodeId: string | null;
  selectedPath: string[];
  stats: SimulationStats;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  triggerEvacuation: () => void;
  cancelEvacuation: () => void;
  calculateRoute: (sourceId: string, destId: string) => string[];
  setSimulationSpeed: (speed: number) => void;
  setCrowdSizeMultiplier: (mult: number) => void;
  setDensityThreshold: (thresh: number) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedPath: (path: string[]) => void;
  injectCrowd: (nodeId: string, amount: number) => void;
  clearLogs: () => void;
  setActiveAlgorithm: (step: AlgorithmStep | null) => void;
  routeSourceId: string | null;
  routeDestId: string | null;
  setRouteSourceId: (id: string | null) => void;
  setRouteDestId: (id: string | null) => void;
}

const SimulationContext = createContext<SimulationContextProps | undefined>(undefined);

const initialNodes: VenueNode[] = [
  { id: 'Gate_A', name: 'Gate A Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 120, x: 150, y: 150 },
  { id: 'Gate_B', name: 'Gate B Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 40, x: 150, y: 450 },
  { id: 'Hall_1', name: 'Main Hall 1', type: 'HALL', capacity: 1000, currentDensity: 820, x: 400, y: 180 },
  { id: 'Hall_2', name: 'Dining Hall 2', type: 'HALL', capacity: 600, currentDensity: 380, x: 400, y: 420 },
  { id: 'Corridor_1', name: 'Central Corridor 1', type: 'CORRIDOR', capacity: 300, currentDensity: 20, x: 650, y: 300 },
  { id: 'Exit_A', name: 'Emergency Exit A', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 900, y: 180 },
  { id: 'Exit_B', name: 'Emergency Exit B', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 900, y: 420 },
];

const initialEdges: VenueEdge[] = [
  { id: 'E_GA_H1', source: 'Gate_A', target: 'Hall_1', capacity: 250, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_GB_H2', source: 'Gate_B', target: 'Hall_2', capacity: 250, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H1_C1', source: 'Hall_1', target: 'Corridor_1', capacity: 500, distance: 60, currentFlow: 0, weight: 60 },
  { id: 'E_H2_C1', source: 'Hall_2', target: 'Corridor_1', capacity: 450, distance: 60, currentFlow: 0, weight: 60 },
  { id: 'E_C1_EA', source: 'Corridor_1', target: 'Exit_A', capacity: 250, distance: 30, currentFlow: 0, weight: 30 },
  { id: 'E_C1_EB', source: 'Corridor_1', target: 'Exit_B', capacity: 250, distance: 30, currentFlow: 0, weight: 30 },
];

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<VenueNode[]>(initialNodes);
  const [edges, setEdges] = useState<VenueEdge[]>(initialEdges);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System initialized. Venue layout graph loaded successfully.' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isEvacuationActive, setIsEvacuationActive] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [crowdSizeMultiplier, setCrowdSizeMultiplier] = useState(1.0);
  const [densityThreshold, setDensityThreshold] = useState(70);
  const [activeAlgorithm, setActiveAlgorithm] = useState<AlgorithmStep | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [stats, setStats] = useState<SimulationStats>({
    totalCrowd: 1360,
    activeZones: 5,
    congestedAreas: 1,
    riskScore: 48,
  });
  const [routeSourceId, setRouteSourceId] = useState<string | null>(null);
  const [routeDestId, setRouteDestId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to add logs
  const addLog = (level: 'INFO' | 'WARNING' | 'CRITICAL', message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
      }
    ].slice(-100)); // Cap logs at 100 entries
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Reset Simulation state
  const resetSimulation = () => {
    setNodes(initialNodes.map(n => ({ ...n })));
    setEdges(initialEdges.map(e => ({ ...e })));
    setIsRunning(false);
    setIsEvacuationActive(false);
    setSelectedPath([]);
    setSelectedNodeId(null);
    setActiveAlgorithm(null);
    setRouteSourceId(null);
    setRouteDestId(null);
    setLogs([
      { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'Simulation reset to default parameters.' }
    ]);
  };

  const startSimulation = () => {
    setIsRunning(true);
    addLog('INFO', 'Simulation started.');
  };

  const pauseSimulation = () => {
    setIsRunning(false);
    addLog('INFO', 'Simulation paused.');
  };

  // Run Route Optimization (A* Search)
  const calculateRoute = (sourceId: string, destId: string): string[] => {
    setRouteSourceId(sourceId);
    setRouteDestId(destId);
    addLog('INFO', `Executing A* Pathfinding from ${sourceId} to ${destId}...`);
    
    // Simulate algorithm step-by-step delay for panel
    const res = findSafestPathAStar(nodes, edges, sourceId, destId);
    
    setActiveAlgorithm({
      name: 'A* Search (Congestion-Aware)',
      complexity: 'O(E log V)',
      visitedNodes: res.visitedNodes,
      executionTime: res.executionTime,
      decision: res.decision
    });

    if (res.path.length > 0) {
      addLog('INFO', `A* Search completed. Safest Route: ${res.path.join(' ➔ ')}. Total cost: ${res.totalCost.toFixed(1)}`);
      setSelectedPath(res.path);
    } else {
      addLog('CRITICAL', `A* Search failed. No available path found from ${sourceId} to ${destId}!`);
    }

    return res.path;
  };

  // Activate Emergency Evacuation (Red Alert Mode)
  const triggerEvacuation = () => {
    setIsEvacuationActive(true);
    setIsRunning(true);
    addLog('CRITICAL', '🔴 EMERGENCY EVACUATION ACTIVE! Initiating egress protocols...');

    // Run Max Flow
    const entries = nodes.filter(n => n.type === 'ENTRY_GATE').map(n => n.id);
    const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT').map(n => n.id);
    const maxFlowRes = computeMaxFlow(nodes, edges, entries, exits);

    // Run Topological sort
    const topoSortRes = runTopologicalSort(nodes, edges);

    // Set active algorithm display to Max Flow
    setActiveAlgorithm({
      name: 'Ford-Fulkerson (Edmonds-Karp)',
      complexity: 'O(E * max_flow)',
      visitedNodes: nodes.map(n => n.id),
      executionTime: maxFlowRes.executionTime,
      decision: `System bottleneck identified at: ${maxFlowRes.bottlenecks.join(', ') || 'none'}. Optimal evacuation throughput is ${maxFlowRes.maxFlow} people/s. Scheduling evacuation in topological order: ${topoSortRes.order.join(' ➔ ')}.`
    });

    addLog('WARNING', `Edmonds-Karp calculated max evacuation flow: ${maxFlowRes.maxFlow} people/second.`);
    if (maxFlowRes.bottlenecks.length > 0) {
      addLog('CRITICAL', `⚠️ Bottlenecks detected at corridors: ${maxFlowRes.bottlenecks.join(', ')}.`);
    }
  };

  const cancelEvacuation = () => {
    setIsEvacuationActive(false);
    addLog('INFO', 'Emergency evacuation stood down. Returning to normal operations.');
    setActiveAlgorithm(null);
  };

  // Inject manual crowd
  const injectCrowd = (nodeId: string, amount: number) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const updated = Math.min(n.capacity, n.currentDensity + amount);
        addLog('INFO', `Injected ${amount} people at ${n.name}. Density: ${updated}/${n.capacity}`);
        return { ...n, currentDensity: updated };
      }
      return n;
    }));
  };

  // Periodic Simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const intervalTime = 3000 / simulationSpeed;

    timerRef.current = setInterval(() => {
      setNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        const nextNodes = prevNodes.map(n => ({ ...n }));

        // 1. Influx: Random arrivals at entry gates (unless in evacuation)
        if (!isEvacuationActive) {
          nextNodes.forEach(node => {
            if (node.type === 'ENTRY_GATE') {
              const maxInject = node.capacity * 0.12 * crowdSizeMultiplier;
              const inject = Math.random() * maxInject;
              node.currentDensity = parseFloat(Math.min(node.capacity, node.currentDensity + inject).toFixed(1));
            }
          });
        }

        // 2. Outflux propagation along edges
        edges.forEach(edge => {
          const src = nextNodes.find(n => n.id === edge.source);
          const dest = nextNodes.find(n => n.id === edge.target);

          if (src && dest) {
            // How much wants to flow: 12% of source density, capped by edge capacity
            let flowAmount = Math.min(src.currentDensity * 0.12, edge.capacity * 0.15 * simulationSpeed);
            
            // Adjust flow in evacuation mode towards exit
            if (isEvacuationActive) {
              flowAmount = Math.min(src.currentDensity * 0.20, edge.capacity * 0.3 * simulationSpeed);
            }

            // Prevent overloading destination beyond capacity
            const destAvailableSpace = dest.capacity - dest.currentDensity;
            const actualFlow = Math.max(0, Math.min(flowAmount, destAvailableSpace, src.currentDensity));

            src.currentDensity = parseFloat(Math.max(0, src.currentDensity - actualFlow).toFixed(1));
            dest.currentDensity = parseFloat(Math.min(dest.capacity, dest.currentDensity + actualFlow).toFixed(1));
          }
        });

        // 3. Drainage: Exits evacuate people out of the venue
        nextNodes.forEach(node => {
          if (node.type === 'EMERGENCY_EXIT') {
            const drainRate = isEvacuationActive ? 0.35 : 0.15;
            const drained = node.currentDensity * drainRate * simulationSpeed;
            node.currentDensity = parseFloat(Math.max(0, node.currentDensity - drained).toFixed(1));
          }
        });

        // 4. Realistic random fluctuations
        nextNodes.forEach(node => {
          if (node.type !== 'EMERGENCY_EXIT') {
            const fluctuation = (Math.random() - 0.5) * 12 * crowdSizeMultiplier; // -6 to +6 people
            node.currentDensity = parseFloat(Math.max(0, Math.min(node.capacity, node.currentDensity + fluctuation)).toFixed(1));
          }
        });

        // Check for anomalies to log
        nextNodes.forEach(node => {
          const densityRatio = node.currentDensity / node.capacity;
          const prevNodeState = nodeMap.get(node.id);
          const prevDensityRatio = prevNodeState ? prevNodeState.currentDensity / prevNodeState.capacity : 0;

          const threshDecimal = densityThreshold / 100;

          if (densityRatio >= 0.9 && prevDensityRatio < 0.9) {
            addLog('CRITICAL', `🔥 Overcapacity Alert! ${node.name} is at ${Math.round(densityRatio * 100)}% capacity (${node.currentDensity}/${node.capacity}).`);
          } else if (densityRatio >= threshDecimal && prevDensityRatio < threshDecimal) {
            addLog('WARNING', `⚠️ High density warning at ${node.name}: ${Math.round(densityRatio * 100)}% capacity.`);
          }
        });

        // 5. Automatic Congestion Rerouting Check
        if (routeSourceId && routeDestId && selectedPath.length > 0) {
          const threshDecimal = densityThreshold / 100;
          const isCongested = selectedPath.some(nodeId => {
            const n = nextNodes.find(x => x.id === nodeId);
            return n && (n.currentDensity / n.capacity) >= threshDecimal;
          });

          if (isCongested) {
            // Recompute congestion-aware shortest path
            const res = findSafestPathAStar(nextNodes, edges, routeSourceId, routeDestId);
            if (res.path.length > 0) {
              const oldPathStr = selectedPath.join('->');
              const newPathStr = res.path.join('->');
              if (oldPathStr !== newPathStr) {
                setTimeout(() => {
                  setSelectedPath(res.path);
                  addLog('WARNING', `🔄 Auto-Reroute Triggered: Path congestion exceeded threshold. Recomputed safest path: ${res.path.join(' ➔ ')}`);
                }, 0);
              }
            }
          }
        }

        return nextNodes;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isEvacuationActive, edges, simulationSpeed, crowdSizeMultiplier, densityThreshold, routeSourceId, routeDestId, selectedPath]);

  // Recalculate global stats and edge dynamic weights whenever nodes density updates
  useEffect(() => {
    const totalCrowd = Math.round(nodes.reduce((sum, n) => sum + n.currentDensity, 0));
    const activeZones = nodes.filter(n => n.currentDensity > 10).length;
    const congestedAreas = nodes.filter(n => (n.currentDensity / n.capacity) * 100 >= densityThreshold).length;

    // Calculate dynamic risk score (based on percentage of congested nodes and total load)
    const congestedRatio = congestedAreas / nodes.length;
    const peakLoad = Math.max(...nodes.map(n => n.currentDensity / n.capacity));
    const riskScore = Math.round(Math.min(100, (congestedRatio * 50) + (peakLoad * 50)));

    setStats({
      totalCrowd,
      activeZones,
      congestedAreas,
      riskScore,
    });

    // Update edge weights dynamically (congestion-aware routing penalty)
    setEdges(prevEdges => prevEdges.map(edge => {
      const dest = nodes.find(n => n.id === edge.target);
      if (!dest) return edge;
      
      const ratio = dest.currentDensity / dest.capacity;
      let penalty = 0;
      if (ratio >= 0.9) penalty = 1000.0;
      else if (ratio >= 0.7) penalty = 300.0;
      else if (ratio >= 0.5) penalty = 50.0;

      return {
        ...edge,
        weight: edge.distance + penalty,
        currentFlow: Math.round(edge.capacity * 0.15 * ratio) // Visual flow representation
      };
    }));

  }, [nodes, densityThreshold]);

  return (
    <SimulationContext.Provider value={{
      nodes,
      edges,
      logs,
      isRunning,
      isEvacuationActive,
      simulationSpeed,
      crowdSizeMultiplier,
      densityThreshold,
      activeAlgorithm,
      selectedNodeId,
      selectedPath,
      stats,
      startSimulation,
      pauseSimulation,
      resetSimulation,
      triggerEvacuation,
      cancelEvacuation,
      calculateRoute,
      setSimulationSpeed,
      setCrowdSizeMultiplier,
      setDensityThreshold,
      setSelectedNodeId,
      setSelectedPath,
      injectCrowd,
      clearLogs,
      setActiveAlgorithm,
      routeSourceId,
      routeDestId,
      setRouteSourceId,
      setRouteDestId,
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
};
