export type NodeType = 'ENTRY_GATE' | 'CORRIDOR' | 'EVENT_ZONE' | 'HALL' | 'EMERGENCY_EXIT';

export interface VenueNode {
  id: string;
  name: string;
  type: NodeType;
  capacity: number;
  currentDensity: number;
  x: number;
  y: number;
}

export interface VenueEdge {
  id: string;
  source: string;
  target: string;
  capacity: number;
  distance: number;
  currentFlow: number;
  weight: number; // Dynamic weight: distance + density penalty
}

export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

export interface AlgorithmStep {
  name: string;
  complexity: string;
  visitedNodes: string[];
  executionTime: number; // in milliseconds
  decision: string;
}

export interface SimulationStats {
  totalCrowd: number;
  activeZones: number;
  congestedAreas: number;
  riskScore: number; // Out of 100
}

export interface AStarStep {
  currentNode: string | null;
  openSet: { nodeId: string; g: number; h: number; f: number }[];
  closedSet: string[];
  gScores: Record<string, number>;
  hScores: Record<string, number>;
  fScores: Record<string, number>;
  parentMap: Record<string, string>;
  currentPath: string[];
  description: string;
}

export interface MaxFlowStep {
  stepNumber: number;
  augmentingPath: string[] | null;
  bottleneckCapacity: number;
  residualCapacities: Record<string, Record<string, number>>;
  currentFlows: Record<string, Record<string, number>>;
  totalFlowSoFar: number;
  description: string;
}

