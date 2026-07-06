import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { 
  VenueNode, 
  VenueEdge, 
  LogEntry, 
  AlgorithmStep, 
  SimulationStats, 
  HazardType, 
  HazardEvent, 
  PanicType, 
  PanickedNode, 
  SmartDecision,
  TimelineEvent,
  TimelineEventType
} from '../types';
import { findSafestPathAStar, computeMaxFlow, runTopologicalSort } from '../utils/algorithms';

export interface HistoricalDensityPoint {
  time: string;
  density: number;
  predictedMA: number;
  predictedES: number;
  predictedTE: number;
}

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
  // ── Hazard system (Feature 2) ──────────────────────────────────────────
  activeHazards: HazardEvent[];
  injectHazard: (nodeId: string, type: HazardType, severity?: number) => void;
  clearHazard: (hazardId: string) => void;
  clearAllHazards: () => void;
  // ── Predictive, Panic & Smart Decision Systems (Phase 2) ──────────────────
  densityHistory: HistoricalDensityPoint[];
  panickedNodes: Record<string, PanickedNode>;
  smartDecision: SmartDecision;
  triggerPanicBFS: (nodeId: string, type: PanicType) => void;
  clearPanic: () => void;
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (type: TimelineEventType, title: string, description: string, nodeId?: string, routePath?: string[]) => void;
  peopleEvacuated: number;
}

const SimulationContext = createContext<SimulationContextProps | undefined>(undefined);

const initialNodes: VenueNode[] = [
  // Layer 1: Gates
  { id: 'Gate_A', name: 'Gate A Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 150, x: 100, y: 100 },
  { id: 'Gate_B', name: 'Gate B Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 80, x: 100, y: 450 },
  { id: 'Gate_C', name: 'Gate C Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 200, x: 100, y: 800 },
  { id: 'Gate_D', name: 'Gate D Entrance', type: 'ENTRY_GATE', capacity: 500, currentDensity: 50, x: 100, y: 1150 },

  // Layer 2: Pre-halls
  { id: 'Hall_1', name: 'West Concourse 1', type: 'HALL', capacity: 1000, currentDensity: 850, x: 600, y: 275 },
  { id: 'Hall_2', name: 'West Concourse 2', type: 'HALL', capacity: 600, currentDensity: 420, x: 600, y: 625 },
  { id: 'Hall_3', name: 'West Concourse 3', type: 'HALL', capacity: 700, currentDensity: 310, x: 600, y: 975 },

  // Layer 3: Internal Corridors
  { id: 'Corridor_1', name: 'Internal Corridor 1', type: 'CORRIDOR', capacity: 300, currentDensity: 50, x: 1100, y: 100 },
  { id: 'Corridor_2', name: 'Internal Corridor 2', type: 'CORRIDOR', capacity: 400, currentDensity: 120, x: 1100, y: 450 },
  { id: 'Corridor_3', name: 'Internal Corridor 3', type: 'CORRIDOR', capacity: 350, currentDensity: 90, x: 1100, y: 800 },
  { id: 'Corridor_4', name: 'Internal Corridor 4', type: 'CORRIDOR', capacity: 300, currentDensity: 30, x: 1100, y: 1150 },

  // Layer 4: Main Halls / Arena
  { id: 'Hall_4', name: 'Main Exhibition Arena 4', type: 'HALL', capacity: 1200, currentDensity: 920, x: 1600, y: 275 },
  { id: 'Hall_5', name: 'Main Plaza 5', type: 'HALL', capacity: 1000, currentDensity: 680, x: 1600, y: 625 },
  { id: 'Hall_6', name: 'Main Pavilion 6', type: 'HALL', capacity: 800, currentDensity: 500, x: 1600, y: 975 },

  // Layer 5: Output Corridors
  { id: 'Corridor_5', name: 'Exit Corridor East 5', type: 'CORRIDOR', capacity: 500, currentDensity: 80, x: 2100, y: 450 },
  { id: 'Corridor_6', name: 'Exit Corridor West 6', type: 'CORRIDOR', capacity: 500, currentDensity: 40, x: 2100, y: 800 },

  // Layer 6: Exits
  { id: 'Exit_A', name: 'Emergency Exit A', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 2600, y: 100 },
  { id: 'Exit_B', name: 'Emergency Exit B', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 2600, y: 450 },
  { id: 'Exit_C', name: 'Emergency Exit C', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 2600, y: 800 },
  { id: 'Exit_D', name: 'Emergency Exit D', type: 'EMERGENCY_EXIT', capacity: 800, currentDensity: 0, x: 2600, y: 1150 },
];

const initialEdges: VenueEdge[] = [
  // Gate to Pre-Hall connections
  { id: 'E_GA_H1', source: 'Gate_A', target: 'Hall_1', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },
  { id: 'E_GB_H1', source: 'Gate_B', target: 'Hall_1', capacity: 250, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_GB_H2', source: 'Gate_B', target: 'Hall_2', capacity: 200, distance: 35, currentFlow: 0, weight: 35 },
  { id: 'E_GC_H2', source: 'Gate_C', target: 'Hall_2', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },
  { id: 'E_GC_H3', source: 'Gate_C', target: 'Hall_3', capacity: 200, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_GD_H3', source: 'Gate_D', target: 'Hall_3', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },

  // Reverse: Pre-Hall to Gate connections (Gates as exits)
  { id: 'E_H1_GA', source: 'Hall_1', target: 'Gate_A', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },
  { id: 'E_H1_GB', source: 'Hall_1', target: 'Gate_B', capacity: 250, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H2_GB', source: 'Hall_2', target: 'Gate_B', capacity: 200, distance: 35, currentFlow: 0, weight: 35 },
  { id: 'E_H2_GC', source: 'Hall_2', target: 'Gate_C', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },
  { id: 'E_H3_GC', source: 'Hall_3', target: 'Gate_C', capacity: 200, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H3_GD', source: 'Hall_3', target: 'Gate_D', capacity: 250, distance: 40, currentFlow: 0, weight: 40 },

  // Pre-Hall to Internal Corridor connections
  { id: 'E_H1_C1', source: 'Hall_1', target: 'Corridor_1', capacity: 350, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H1_C2', source: 'Hall_1', target: 'Corridor_2', capacity: 300, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_H2_C2', source: 'Hall_2', target: 'Corridor_2', capacity: 400, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H2_C3', source: 'Hall_2', target: 'Corridor_3', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H3_C3', source: 'Hall_3', target: 'Corridor_3', capacity: 350, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_H3_C4', source: 'Hall_3', target: 'Corridor_4', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },

  // Reverse: Internal Corridor to Pre-Hall connections
  { id: 'E_C1_H1', source: 'Corridor_1', target: 'Hall_1', capacity: 350, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C2_H1', source: 'Corridor_2', target: 'Hall_1', capacity: 300, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_C2_H2', source: 'Corridor_2', target: 'Hall_2', capacity: 400, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_C3_H2', source: 'Corridor_3', target: 'Hall_2', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C3_H3', source: 'Corridor_3', target: 'Hall_3', capacity: 350, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_C4_H3', source: 'Corridor_4', target: 'Hall_3', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },

  // Internal Corridor to Main Hall connections
  { id: 'E_C1_H4', source: 'Corridor_1', target: 'Hall_4', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C2_H4', source: 'Corridor_2', target: 'Hall_4', capacity: 350, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_C2_H5', source: 'Corridor_2', target: 'Hall_5', capacity: 400, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C3_H5', source: 'Corridor_3', target: 'Hall_5', capacity: 350, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_C3_H6', source: 'Corridor_3', target: 'Hall_6', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C4_H6', source: 'Corridor_4', target: 'Hall_6', capacity: 350, distance: 55, currentFlow: 0, weight: 55 },

  // Reverse: Main Hall to Internal Corridor connections
  { id: 'E_H4_C1', source: 'Hall_4', target: 'Corridor_1', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H4_C2', source: 'Hall_4', target: 'Corridor_2', capacity: 350, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H5_C2', source: 'Hall_5', target: 'Corridor_2', capacity: 400, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H5_C3', source: 'Hall_5', target: 'Corridor_3', capacity: 350, distance: 45, currentFlow: 0, weight: 45 },
  { id: 'E_H6_C3', source: 'Hall_6', target: 'Corridor_3', capacity: 300, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H6_C4', source: 'Hall_6', target: 'Corridor_4', capacity: 350, distance: 55, currentFlow: 0, weight: 55 },

  // Main Hall to External Corridor connections
  { id: 'E_H4_C5', source: 'Hall_4', target: 'Corridor_5', capacity: 450, distance: 60, currentFlow: 0, weight: 60 },
  { id: 'E_H5_C5', source: 'Hall_5', target: 'Corridor_5', capacity: 500, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_H5_C6', source: 'Hall_5', target: 'Corridor_6', capacity: 500, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_H6_C6', source: 'Hall_6', target: 'Corridor_6', capacity: 450, distance: 60, currentFlow: 0, weight: 60 },

  // Reverse: External Corridor to Main Hall connections
  { id: 'E_C5_H4', source: 'Corridor_5', target: 'Hall_4', capacity: 450, distance: 60, currentFlow: 0, weight: 60 },
  { id: 'E_C5_H5', source: 'Corridor_5', target: 'Hall_5', capacity: 500, distance: 50, currentFlow: 0, weight: 50 },
  { id: 'E_C6_H5', source: 'Corridor_6', target: 'Hall_5', capacity: 500, distance: 55, currentFlow: 0, weight: 55 },
  { id: 'E_C6_H6', source: 'Corridor_6', target: 'Hall_6', capacity: 450, distance: 60, currentFlow: 0, weight: 60 },

  // External Corridor to Exit connections
  { id: 'E_C5_EA', source: 'Corridor_5', target: 'Exit_A', capacity: 250, distance: 30, currentFlow: 0, weight: 30 },
  { id: 'E_C5_EB', source: 'Corridor_5', target: 'Exit_B', capacity: 300, distance: 35, currentFlow: 0, weight: 35 },
  { id: 'E_C6_EC', source: 'Corridor_6', target: 'Exit_C', capacity: 300, distance: 35, currentFlow: 0, weight: 35 },
  { id: 'E_C6_ED', source: 'Corridor_6', target: 'Exit_D', capacity: 250, distance: 30, currentFlow: 0, weight: 30 },
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
    totalCrowd: 4570,
    activeZones: 16,
    congestedAreas: 2,
    riskScore: 54,
    riskLevel: 'MODERATE',
    bottleneckCount: 0,
    avgDensityRatio: 0.45,
    maxFlowUtilization: 0.25,
    stampedeProbability: 28,
  });
  const prevRiskLevelRef = useRef<string>('MODERATE');
  const prevAlgorithmRef = useRef<string>('A* Search');
  const [routeSourceId, setRouteSourceId] = useState<string | null>(null);
  const [routeDestId, setRouteDestId] = useState<string | null>(null);

  const [activeHazards, setActiveHazards] = useState<HazardEvent[]>([]);

  // ── Phase 2 States ────────────────────────────────────────────────────────
  const [densityHistory, setDensityHistory] = useState<HistoricalDensityPoint[]>([]);
  const [panickedNodes, setPanickedNodes] = useState<Record<string, PanickedNode>>({});
  const [smartDecision, setSmartDecision] = useState<SmartDecision>({
    selectedAlgorithm: 'A* Search',
    situation: 'Normal Operations',
    reason: 'Normal low-density routing. Standard A* pathfinding calculates the shortest physical distance paths.',
    estimatedImprovement: 0,
    decisionConfidence: 98,
  });

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    {
      id: 'init-event',
      timestamp: new Date().toLocaleTimeString(),
      type: 'STABILIZED',
      title: 'Command AI Initialized',
      description: 'Dynamic incident logger and rule-based AI routing coordinator active.'
    }
  ]);
  const [peopleEvacuated, setPeopleEvacuated] = useState<number>(0);

  const addTimelineEvent = (type: TimelineEventType, title: string, description: string, nodeId?: string, routePath?: string[]) => {
    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      title,
      description,
      nodeId,
      routePath
    };
    setTimelineEvents(prev => [newEvent, ...prev].slice(0, 100));
  };

  const triggerPanicBFS = (nodeId: string, type: PanicType) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setPanickedNodes(prev => ({
      ...prev,
      [nodeId]: {
        nodeId,
        level: 100,
        sourceType: type,
      }
    }));

    // Trigger evacuation as panic is a critical threat!
    setIsEvacuationActive(true);
    setIsRunning(true);

    addLog('CRITICAL', `🚨 PANIC ROOT DETECTED: ${type} panic spreading from ${node.name}! BFS propagation active. Egress speed increased, routing adjustments initiated.`);
    addTimelineEvent('PANIC_TRIGGERED', `${type} PANIC TRIGGERED`, `${type} panic epicenter established at ${node.name}. BFS propagation spreading outwards.`, nodeId);
  };

  const clearPanic = () => {
    setPanickedNodes({});
    addLog('INFO', '✅ Panic cleared. Venue crowd behavior stabilized.');
    addTimelineEvent('STABILIZED', 'Panic Stabilized', 'All panic levels normalized and crowd behavioral parameters stabilized.');
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evacCompletedLoggedRef = useRef(false);

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

  // Pre-populate density history with baseline values on mount
  useEffect(() => {
    const now = Date.now();
    const historyPoints: HistoricalDensityPoint[] = [];
    const baseCrowd = 4570;
    for (let i = 12; i >= 0; i--) {
      const timeStr = new Date(now - i * 3000).toLocaleTimeString();
      const densityVal = Math.round(baseCrowd + (Math.random() - 0.5) * 100);
      historyPoints.push({
        time: timeStr,
        density: densityVal,
        predictedMA: densityVal,
        predictedES: densityVal,
        predictedTE: densityVal,
      });
    }
    setDensityHistory(historyPoints);
  }, []);

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
    setPanickedNodes({});
    
    // Reset density history
    const now = Date.now();
    const historyPoints: HistoricalDensityPoint[] = [];
    const baseCrowd = 4570;
    for (let i = 12; i >= 0; i--) {
      const timeStr = new Date(now - i * 3000).toLocaleTimeString();
      const densityVal = Math.round(baseCrowd + (Math.random() - 0.5) * 100);
      historyPoints.push({
        time: timeStr,
        density: densityVal,
        predictedMA: densityVal,
        predictedES: densityVal,
        predictedTE: densityVal,
      });
    }
    setDensityHistory(historyPoints);

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
    addTimelineEvent('EVACUATION_STARTED', 'Emergency Evacuation Initiated', 'Evacuation protocols triggered. Algorithmic schedulers computing bottleneck routes.');

    // Run Max Flow
    const entries = nodes.filter(n => n.type === 'HALL' || n.type === 'CORRIDOR').map(n => n.id);
    const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT' || n.type === 'ENTRY_GATE').map(n => n.id);
    const maxFlowRes = computeMaxFlow(nodes, edges, entries, exits);

    // Run Topological sort
    const topoSortRes = runTopologicalSort(nodes, edges);

    // Set active algorithm display to Max Flow
    setActiveAlgorithm({
      name: 'Ford-Fulkerson (Edmonds-Karp)',
      complexity: 'O(E * max_flow)',
      visitedNodes: nodes.map(n => n.id),
      executionTime: maxFlowRes.executionTime,
      decision: `System bottleneck identified at: ${maxFlowRes.bottlenecks.join(', ') || 'none'}. Optimal evacuation throughput is ${maxFlowRes.maxFlow} people/s. Scheduling evacuation order: ${topoSortRes.order.join(' ➔ ') || 'N/A (Cycle detected due to bidirectional graph)'}.`
    });

    addLog('WARNING', `Edmonds-Karp calculated max evacuation flow: ${maxFlowRes.maxFlow} people/second.`);
    if (maxFlowRes.bottlenecks.length > 0) {
      addLog('CRITICAL', `⚠️ Bottlenecks detected at corridors: ${maxFlowRes.bottlenecks.join(', ')}.`);
    }
  };

  const cancelEvacuation = () => {
    setIsEvacuationActive(false);
    evacCompletedLoggedRef.current = false;
    addLog('INFO', 'Emergency evacuation stood down. Returning to normal operations.');
    addTimelineEvent('STABILIZED', 'Evacuation Stood Down', 'Emergency evacuation mode deactivated. Normal operations resumed.');
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

  // ── Hazard Injection (Feature 2) ──────────────────────────────────────────
  const injectHazard = (nodeId: string, type: HazardType, severity: number = 3) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const connectedEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
    const affectedEdgeIds = connectedEdges.map(e => e.id);
    const originalEdgeDistances: Record<string, number> = {};
    const originalEdgeCapacities: Record<string, number> = {};
    connectedEdges.forEach(e => {
      originalEdgeDistances[e.id] = e.distance;
      originalEdgeCapacities[e.id] = e.capacity;
    });

    const hazardEvent: HazardEvent = {
      id: Math.random().toString(36).slice(2, 10),
      nodeId,
      type,
      injectedAt: new Date().toLocaleTimeString(),
      severity,
      affectedEdgeIds,
      originalNodeDensity: node.currentDensity,
      originalEdgeDistances,
      originalEdgeCapacities,
    };

    // Apply node effects
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      switch (type) {
        case 'FIRE':               return { ...n, currentDensity: n.capacity };
        case 'FLOOD':              return { ...n, currentDensity: Math.min(n.capacity, n.capacity * 0.9) };
        case 'POWER_FAILURE':      return { ...n, currentDensity: Math.min(n.capacity, n.currentDensity * 1.3) };
        default:                   return n;
      }
    }));

    // Apply edge effects via distance (feeds dynamic weight recalc automatically)
    setEdges(prev => prev.map(e => {
      if (!affectedEdgeIds.includes(e.id)) return e;
      switch (type) {
        case 'FIRE':                  return { ...e, distance: e.distance + 800 * severity };
        case 'SMOKE':                 return { ...e, capacity: Math.max(1, Math.floor(e.capacity / 2)) };
        case 'BLOCKED_CORRIDOR':      return { ...e, distance: 999999 };
        case 'POWER_FAILURE':         return e.source === nodeId ? { ...e, capacity: 0 } : e;
        case 'FLOOD':                 return { ...e, distance: e.distance + 400 * severity };
        case 'STRUCTURAL_COLLAPSE':   return { ...e, distance: 999999 };
        case 'MEDICAL_EMERGENCY':     return { ...e, distance: e.distance + 200 };
        default:                      return e;
      }
    }));

    setActiveHazards(prev => [...prev, hazardEvent]);

    const labels: Record<HazardType, string> = {
      FIRE: '🔥 FIRE DETECTED',
      SMOKE: '💨 SMOKE ALERT',
      BLOCKED_CORRIDOR: '🚧 CORRIDOR BLOCKED',
      MEDICAL_EMERGENCY: '🏥 MEDICAL EMERGENCY',
      POWER_FAILURE: '⚡ POWER FAILURE',
      FLOOD: '🌊 FLOOD ALERT',
      STRUCTURAL_COLLAPSE: '💀 STRUCTURAL COLLAPSE',
    };
    addLog('CRITICAL', `${labels[type]} at ${node.name}! Severity ${severity}/5. Rerouting initiated.`);
    
    // Auto-timeline log for hazard injection
    const timelineTypes: Record<HazardType, TimelineEventType> = {
      FIRE: 'HAZARD_INJECTED',
      SMOKE: 'HAZARD_INJECTED',
      BLOCKED_CORRIDOR: 'CONGESTION_ALERT',
      MEDICAL_EMERGENCY: 'CONGESTION_ALERT',
      POWER_FAILURE: 'CONGESTION_ALERT',
      FLOOD: 'HAZARD_INJECTED',
      STRUCTURAL_COLLAPSE: 'HAZARD_INJECTED'
    };
    addTimelineEvent(timelineTypes[type], `${type} INCIDENT INJECTED`, `${labels[type]} triggered at ${node.name} with severity index ${severity}/5. Adaptive routes computed.`, nodeId);
  };

  const clearHazard = (hazardId: string) => {
    const hazard = activeHazards.find(h => h.id === hazardId);
    if (!hazard) return;
    setEdges(prev => prev.map(e => {
      if (!hazard.affectedEdgeIds.includes(e.id)) return e;
      return {
        ...e,
        distance: hazard.originalEdgeDistances[e.id] ?? e.distance,
        capacity: hazard.originalEdgeCapacities[e.id] ?? e.capacity,
      };
    }));
    setActiveHazards(prev => prev.filter(h => h.id !== hazardId));
    addLog('INFO', `Hazard ${hazard.type} at node ${hazard.nodeId} cleared. Routing restored.`);
    addTimelineEvent('STABILIZED', `${hazard.type} Cleared`, `All hazard parameters for ${hazard.type} at sector ${hazard.nodeId} have been resolved. Corridors stabilized.`, hazard.nodeId);
  };

  const clearAllHazards = () => {
    const distMap = new Map<string, number>();
    const capMap  = new Map<string, number>();
    activeHazards.forEach(h => {
      h.affectedEdgeIds.forEach(eid => {
        if (!distMap.has(eid)) distMap.set(eid, h.originalEdgeDistances[eid]);
        if (!capMap.has(eid))  capMap.set(eid,  h.originalEdgeCapacities[eid]);
      });
    });
    setEdges(prev => prev.map(e =>
      distMap.has(e.id)
        ? { ...e, distance: distMap.get(e.id)!, capacity: capMap.get(e.id) ?? e.capacity }
        : e
    ));
    setActiveHazards([]);
    addLog('INFO', 'All hazards cleared. Venue restored to normal operations.');
    addTimelineEvent('STABILIZED', 'All Hazards Cleared', 'All active emergency hazard zones have been successfully cleared. Pathfinding returned to baseline.');
  };

  // Periodic Simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const intervalTime = 3000 / simulationSpeed;

    timerRef.current = setInterval(() => {
      // 1. First spread panic levels via BFS (runs at each simulation step)
      setPanickedNodes(prevPanic => {
        if (Object.keys(prevPanic).length === 0) return prevPanic;
        const nextPanic = { ...prevPanic };
        let expanded = false;

        // BFS: For all active panic nodes, spread to neighbors at -25 level
        Object.entries(prevPanic).forEach(([nodeId, pNode]) => {
          if (pNode.level > 0) {
            const neighbors = edges
              .filter(e => e.source === nodeId || e.target === nodeId)
              .map(e => e.source === nodeId ? e.target : e.source);

            neighbors.forEach(neighborId => {
              const newLevel = Math.max(0, pNode.level - 25);
              if (newLevel > 0 && (!nextPanic[neighborId] || nextPanic[neighborId].level < newLevel)) {
                nextPanic[neighborId] = {
                  nodeId: neighborId,
                  level: newLevel,
                  sourceType: pNode.sourceType
                };
                expanded = true;
              }
            });
          }
        });

        if (expanded) {
          // Trigger logs once in a while or when expansion spreads
        }

        return nextPanic;
      });

      // 2. Perform node crowd density movement
      let stepEvacuated = 0;
      setNodes(prevNodes => {
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        const nextNodes = prevNodes.map(n => ({ ...n }));

        // A. Influx: Random arrivals at entry gates (unless in evacuation)
        if (!isEvacuationActive) {
          nextNodes.forEach(node => {
            if (node.type === 'ENTRY_GATE') {
              const maxInject = node.capacity * 0.12 * crowdSizeMultiplier;
              const inject = Math.random() * maxInject;
              node.currentDensity = parseFloat(Math.min(node.capacity, node.currentDensity + inject).toFixed(1));
            }
          });
        }

        // B. Outflux propagation along edges (influenced by panic speed factors)
        edges.forEach(edge => {
          const src = nextNodes.find(n => n.id === edge.source);
          const dest = nextNodes.find(n => n.id === edge.target);

          if (src && dest) {
            // Check panic modifier: if source or target node is panicked, speed increases by 1.8x
            const srcPanic = panickedNodes[edge.source];
            const destPanic = panickedNodes[edge.target];
            const isPanicked = (srcPanic && srcPanic.level > 0) || (destPanic && destPanic.level > 0);
            const speedFactor = isPanicked ? 1.8 : 1.0;

            // How much wants to flow: 12% of source density, capped by edge capacity
            let flowAmount = Math.min(src.currentDensity * 0.12 * speedFactor, edge.capacity * 0.15 * simulationSpeed * speedFactor);
            
            // Adjust flow in evacuation mode towards exit
            if (isEvacuationActive) {
              flowAmount = Math.min(src.currentDensity * 0.20 * speedFactor, edge.capacity * 0.3 * simulationSpeed * speedFactor);
            }

            // Prevent overloading destination beyond capacity
            const destAvailableSpace = dest.capacity - dest.currentDensity;
            const actualFlow = Math.max(0, Math.min(flowAmount, destAvailableSpace, src.currentDensity));

            src.currentDensity = parseFloat(Math.max(0, src.currentDensity - actualFlow).toFixed(1));
            dest.currentDensity = parseFloat(Math.min(dest.capacity, dest.currentDensity + actualFlow).toFixed(1));
          }
        });

        // C. Drainage: Exits (and Gates in evacuation mode) evacuate people out of the venue
        nextNodes.forEach(node => {
          if (node.type === 'EMERGENCY_EXIT' || (node.type === 'ENTRY_GATE' && isEvacuationActive)) {
            const drainRate = isEvacuationActive ? 0.35 : 0.15;
            const drained = node.currentDensity * drainRate * simulationSpeed;
            node.currentDensity = parseFloat(Math.max(0, node.currentDensity - drained).toFixed(1));
            if (isEvacuationActive) {
              stepEvacuated += drained;
            }
          }
        });

        // D. Realistic random fluctuations (increased by 2.5x under panic)
        nextNodes.forEach(node => {
          if (node.type !== 'EMERGENCY_EXIT') {
            const pNode = panickedNodes[node.id];
            const panicModifier = pNode ? 1.0 + (pNode.level / 100) * 1.5 : 1.0;
            const fluctuation = (Math.random() - 0.5) * 12 * crowdSizeMultiplier * panicModifier;
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
            addTimelineEvent('CONGESTION_ALERT', 'Critical Overcapacity', `${node.name} is critically packed at ${Math.round(densityRatio * 100)}% capacity.`, node.id);
          } else if (densityRatio >= threshDecimal && prevDensityRatio < threshDecimal) {
            addLog('WARNING', `⚠️ High density warning at ${node.name}: ${Math.round(densityRatio * 100)}% capacity.`);
            addTimelineEvent('CONGESTION_ALERT', 'Congestion Threshold Cross', `${node.name} density has crossed threshold at ${Math.round(densityRatio * 100)}%.`, node.id);
          }
        });

        // E. Automatic Congestion Rerouting Check
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
                  addTimelineEvent('REROUTED', 'Path Redirected', `Path congestion exceeded limit. Rerouted to safer corridor: ${res.path[0]} ➔ ${res.path[res.path.length-1]} bypass.`, res.path[0], res.path);
                }, 0);
              }
            }
          }
        }

        return nextNodes;
      });

      if (stepEvacuated > 0) {
        setPeopleEvacuated(prev => prev + Math.round(stepEvacuated));
      }
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isEvacuationActive, edges, simulationSpeed, crowdSizeMultiplier, densityThreshold, routeSourceId, routeDestId, selectedPath, panickedNodes]);

  // Recalculate global stats, edge dynamic weights, predictions, and smart decisions whenever nodes density updates
  useEffect(() => {
    const totalCrowd = Math.round(nodes.reduce((sum, n) => sum + n.currentDensity, 0));
    const activeZones = nodes.filter(n => n.currentDensity > 10).length;
    const congestedAreas = nodes.filter(n => (n.currentDensity / n.capacity) * 100 >= densityThreshold).length;

    // === STAMPEDE RISK PREDICTOR ===
    const nonExitNodes = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');
    const avgDensityRatio = nonExitNodes.reduce((sum, n) => sum + (n.currentDensity / n.capacity), 0) / Math.max(nonExitNodes.length, 1);

    // Update edge weights dynamically
    const updatedEdges = edges.map(edge => {
      const dest = nodes.find(n => n.id === edge.target);
      if (!dest) return edge;
      
      const ratio = dest.currentDensity / dest.capacity;
      
      // If either node is panicked, ignore longer routes (penalty is 0) to prefer closest physical exits
      const isPanicked = panickedNodes[edge.source] || panickedNodes[edge.target];
      let penalty = 0;
      if (!isPanicked) {
        if (ratio >= 0.9) penalty = 1000.0;
        else if (ratio >= 0.7) penalty = 300.0;
        else if (ratio >= 0.5) penalty = 50.0;
      }

      return {
        ...edge,
        weight: edge.distance + penalty,
        currentFlow: Math.round(edge.capacity * 0.25 * ratio)
      };
    });

    const maxFlowUtilization = updatedEdges.reduce((max, e) => {
      const util = e.capacity > 0 ? e.currentFlow / e.capacity : 0;
      return Math.max(max, util);
    }, 0);

    const bottleneckCount = updatedEdges.filter(e => e.capacity > 0 && (e.currentFlow / e.capacity) >= 0.9).length;

    const densityComponent = avgDensityRatio * 45;
    const flowComponent = maxFlowUtilization * 35;
    const bottleneckComponent = Math.min(bottleneckCount * 10, 20);
    const riskScore = Math.round(Math.min(100, densityComponent + flowComponent + bottleneckComponent));

    // Panic amplification to stampede probability
    const peakLoad = Math.max(...nodes.map(n => n.currentDensity / n.capacity));
    const panickedCount = Object.keys(panickedNodes).length;
    const panicRatio = panickedCount / Math.max(1, nodes.length);
    const stampedeProbability = Math.round(Math.min(100, riskScore * 0.6 + peakLoad * 40 + panicRatio * 20));

    // Determine risk level
    let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'SAFE';
    if (riskScore >= 80) riskLevel = 'CRITICAL';
    else if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 35) riskLevel = 'MODERATE';

    // Trigger early-warning alerts
    if (riskLevel !== prevRiskLevelRef.current) {
      if (riskLevel === 'CRITICAL') {
        addLog('CRITICAL', `🚨 STAMPEDE RISK CRITICAL! Score: ${riskScore}/100. Probability: ${stampedeProbability}%. Immediate evacuation recommended.`);
        addTimelineEvent('STAMPEDE_RISK_SPIKE', 'Stampede Risk Critical', `Stampede risk score has reached ${riskScore}/100. Probability ${stampedeProbability}%.`);
      } else if (riskLevel === 'HIGH') {
        addLog('WARNING', `⚠️ High stampede risk detected! Score: ${riskScore}/100. ${bottleneckCount} bottleneck(s) active. Monitor and prepare evacuation routes.`);
        addTimelineEvent('STAMPEDE_RISK_SPIKE', 'Stampede Risk High', `High stampede risk detected. Bottlenecks active: ${bottleneckCount}.`);
      } else if (riskLevel === 'MODERATE' && prevRiskLevelRef.current !== 'SAFE') {
        addLog('INFO', `✅ Stampede risk reduced to Moderate. Score: ${riskScore}/100. Situation stabilizing.`);
        addTimelineEvent('STABILIZED', 'Stampede Risk Reduced', `Stampede risk stabilized to Moderate (Score: ${riskScore}/100).`);
      } else if (riskLevel === 'SAFE') {
        addLog('INFO', `✅ Stampede risk cleared. Score: ${riskScore}/100. All zones within safe parameters.`);
        addTimelineEvent('STABILIZED', 'Stampede Risk Cleared', 'Stampede risk cleared. All sectors normal.');
      }
      prevRiskLevelRef.current = riskLevel;
    }

    // Evacuation complete check
    if (isEvacuationActive && totalCrowd < 50 && !evacCompletedLoggedRef.current) {
      addTimelineEvent('STABILIZED', 'Evacuation Completed', 'All venue sectors have been successfully cleared. Occupants evacuated.');
      evacCompletedLoggedRef.current = true;
    } else if (!isEvacuationActive) {
      evacCompletedLoggedRef.current = false;
    }

    setStats({
      totalCrowd,
      activeZones,
      congestedAreas,
      riskScore,
      riskLevel,
      bottleneckCount,
      avgDensityRatio: parseFloat(avgDensityRatio.toFixed(3)),
      maxFlowUtilization: parseFloat(maxFlowUtilization.toFixed(3)),
      stampedeProbability,
    });

    setEdges(updatedEdges);

    // ── Update densityHistory & Compute predictions ─────────────────────────
    setDensityHistory(prev => {
      const timeStr = new Date().toLocaleTimeString();
      const newPointBase = {
        time: timeStr,
        density: totalCrowd,
        predictedMA: totalCrowd,
        predictedES: totalCrowd,
        predictedTE: totalCrowd,
      };

      const newHistory = [...prev.filter(pt => !pt.time.startsWith('+')), newPointBase].slice(-20);
      const m = newHistory.length;

      // 1. Moving Average (N=4)
      const N = Math.min(4, m);
      const lastN = newHistory.slice(-N);
      const maVal = lastN.reduce((sum, p) => sum + p.density, 0) / N;
      
      // Calculate MA slope over last 3 points
      let maSlope = 0;
      if (m >= 3) {
        const prevMA = newHistory.slice(-3, -1).reduce((sum, p) => sum + p.density, 0) / 2;
        maSlope = (maVal - prevMA) / 2;
      }

      // 2. Exponential Smoothing (alpha=0.35, beta=0.2)
      let esVal = newHistory[0].density;
      let esTrend = 0;
      for (let i = 1; i < m; i++) {
        const prevEs = esVal;
        esVal = 0.35 * newHistory[i].density + 0.65 * prevEs;
        esTrend = 0.2 * (esVal - prevEs) + 0.8 * esTrend;
      }

      // 3. Trend Estimation (Linear Regression on last 5 points)
      const numPoints = Math.min(5, m);
      const regPoints = newHistory.slice(-numPoints);
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < numPoints; i++) {
        const x = i + 1;
        const y = regPoints[i].density;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }
      const denominator = (numPoints * sumXX - sumX * sumX);
      const slope = denominator !== 0 ? (numPoints * sumXY - sumX * sumY) / denominator : 0;

      // Generate future forecast points
      // +30s (+10 ticks), +1m (+20 ticks), +2m (+40 ticks)
      const f30 = {
        time: '+30s',
        density: null as any,
        predictedMA: Math.max(0, Math.round(totalCrowd + 10 * maSlope)),
        predictedES: Math.max(0, Math.round(esVal + 10 * esTrend)),
        predictedTE: Math.max(0, Math.round(totalCrowd + 10 * slope)),
      };

      const f1m = {
        time: '+1m',
        density: null as any,
        predictedMA: Math.max(0, Math.round(totalCrowd + 20 * maSlope)),
        predictedES: Math.max(0, Math.round(esVal + 20 * esTrend)),
        predictedTE: Math.max(0, Math.round(totalCrowd + 20 * slope)),
      };

      const f2m = {
        time: '+2m',
        density: null as any,
        predictedMA: Math.max(0, Math.round(totalCrowd + 40 * maSlope)),
        predictedES: Math.max(0, Math.round(esVal + 40 * esTrend)),
        predictedTE: Math.max(0, Math.round(totalCrowd + 40 * slope)),
      };

      return [...newHistory, f30, f1m, f2m];
    });

    // ── Smart Decision Engine rules ──────────────────────────────────────────
    const hasHazards = activeHazards.length > 0;
    const congestedCount = congestedAreas;
    const hasBlocked = edges.some(e => e.distance > 900000);

    let selectedAlgorithm = 'A* Search';
    let situation = 'Normal Operations';
    let reason = 'Normal low-density routing. Standard A* pathfinding calculates the shortest physical distance paths.';
    let estimatedImprovement = 0;
    let decisionConfidence = 98;

    if (hasHazards && panickedCount >= 3) {
      selectedAlgorithm = 'Hybrid Routing (A* + Max Flow)';
      situation = 'Multi-Hazard Emergency & Panic Spread';
      reason = 'Combining Ford-Fulkerson bottleneck capacity limits with local A* shortest paths to avoid active fire/explosion zones.';
      estimatedImprovement = 45;
      decisionConfidence = 92;
    } else if (riskLevel === 'CRITICAL') {
      selectedAlgorithm = 'Ford-Fulkerson + A*';
      situation = 'Critical Venue Crowding';
      reason = 'Maximum flow solver identifies escape throughput bottlenecks, while A* routes individual cohorts along lowest-risk paths.';
      estimatedImprovement = 38;
      decisionConfidence = 89;
    } else if (isEvacuationActive && panickedCount > 0) {
      selectedAlgorithm = 'BFS Evacuation Scheduling';
      situation = 'Active Evacuation with Panic';
      reason = 'Multi-source BFS establishes wave-based egress scheduling, ordering evacuation from the closest panicked zones outward.';
      estimatedImprovement = 32;
      decisionConfidence = 85;
    } else if (hasBlocked) {
      selectedAlgorithm = 'A* Search (Congestion-Bypass)';
      situation = 'Corridor Blockages Detected';
      reason = 'Bypasses blocked corridors by dynamically setting affected edge weights to infinity and finding alternative routes.';
      estimatedImprovement = 25;
      decisionConfidence = 95;
    } else if (congestedCount >= 3) {
      selectedAlgorithm = 'Ford-Fulkerson (Max Flow)';
      situation = 'Heavy Congestion';
      reason = 'Solves the max flow capacity problem over the entire network to redistribute flow away from saturated corridors.';
      estimatedImprovement = 20;
      decisionConfidence = 88;
    } else if (isEvacuationActive) {
      selectedAlgorithm = 'BFS Scheduling';
      situation = 'Active Evacuation';
      reason = 'BFS calculates optimal ordering of node drainage to avoid bottlenecks at exit gates.';
      estimatedImprovement = 15;
      decisionConfidence = 90;
    }

    if (selectedAlgorithm !== prevAlgorithmRef.current) {
      addLog('INFO', `🤖 Smart Decision Engine switched routing core to: ${selectedAlgorithm} (${situation}).`);
      
      // Update the active algorithm structure in global state for HUD panels
      setActiveAlgorithm({
        name: selectedAlgorithm,
        complexity: selectedAlgorithm.includes('Ford') ? 'O(E * max_flow)' : 'O(E log V)',
        visitedNodes: nodes.map(n => n.id),
        executionTime: 0.12,
        decision: reason
      });

      prevAlgorithmRef.current = selectedAlgorithm;
    }

    setSmartDecision({
      selectedAlgorithm,
      situation,
      reason,
      estimatedImprovement,
      decisionConfidence,
    });

  }, [nodes, densityThreshold, activeHazards, isEvacuationActive, panickedNodes]);

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
      activeHazards,
      injectHazard,
      clearHazard,
      clearAllHazards,
      densityHistory,
      panickedNodes,
      smartDecision,
      triggerPanicBFS,
      clearPanic,
      timelineEvents,
      addTimelineEvent,
      peopleEvacuated,
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
