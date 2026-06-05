import type { VenueNode, VenueEdge } from '../types';

// ----------------------------------------------------
// A* PATHFINDING ALGORITHM
// ----------------------------------------------------
export interface AStarResult {
  path: string[];
  totalCost: number;
  visitedNodes: string[];
  executionTime: number;
  decision: string;
}

export function findSafestPathAStar(
  nodes: VenueNode[],
  edges: VenueEdge[],
  sourceId: string,
  targetId: string
): AStarResult {
  const startTime = performance.now();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Custom congestion-aware edge cost
  const getEdgeCost = (edge: VenueEdge): number => {
    const dest = nodeMap.get(edge.target);
    if (!dest) return edge.distance;
    
    // Density penalty: matches C++ weight calculation
    const densityRatio = dest.currentDensity / dest.capacity;
    let penalty = 0;
    if (densityRatio >= 0.9) {
      penalty = 1000.0;
    } else if (densityRatio >= 0.7) {
      penalty = 300.0;
    } else if (densityRatio >= 0.5) {
      penalty = 50.0;
    }
    return edge.distance + penalty;
  };

  // Euclidean Heuristic h(n)
  const heuristic = (uId: string, vId: string): number => {
    const u = nodeMap.get(uId);
    const v = nodeMap.get(vId);
    if (!u || !v) return 0;
    return Math.sqrt(Math.pow(u.x - v.x, 2) + Math.pow(u.y - v.y, 2));
  };

  // A* structures
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const parent = new Map<string, string>();
  
  nodes.forEach(n => {
    gScore.set(n.id, Infinity);
    fScore.set(n.id, Infinity);
  });
  
  gScore.set(sourceId, 0);
  fScore.set(sourceId, heuristic(sourceId, targetId));

  const openSet = new Set<string>([sourceId]);
  const visitedNodes: string[] = [];

  while (openSet.size > 0) {
    // Get node with lowest fScore
    let currentId = Array.from(openSet).reduce((minId, id) => 
      (fScore.get(id) || Infinity) < (fScore.get(minId) || Infinity) ? id : minId
    );

    visitedNodes.push(currentId);
    if (currentId === targetId) {
      break;
    }

    openSet.delete(currentId);

    // Find outgoing edges
    const outgoing = edges.filter(e => e.source === currentId);
    for (const edge of outgoing) {
      const neighborId = edge.target;
      const cost = getEdgeCost(edge);
      const tentativeGScore = (gScore.get(currentId) || 0) + cost;

      if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
        parent.set(neighborId, currentId);
        gScore.set(neighborId, tentativeGScore);
        fScore.set(neighborId, tentativeGScore + heuristic(neighborId, targetId));
        openSet.add(neighborId);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr = targetId;
  if (parent.has(curr) || curr === sourceId) {
    while (curr) {
      path.push(curr);
      curr = parent.get(curr) || '';
    }
    path.reverse();
  }

  const endTime = performance.now();
  const execTime = parseFloat((endTime - startTime).toFixed(3));

  // Determine decision based on path congestion
  let decision = 'Path is clear. Proceed with evacuation.';
  const congestedNodes = path.filter(id => {
    const node = nodeMap.get(id);
    return node && (node.currentDensity / node.capacity) >= 0.7;
  });
  if (congestedNodes.length > 0) {
    const nodeNames = congestedNodes.map(id => nodeMap.get(id)?.name || id).join(', ');
    decision = `Rerouted. Bypassed or minimised time through congested zones: ${nodeNames}.`;
  }

  return {
    path,
    totalCost: gScore.get(targetId) || 0,
    visitedNodes,
    executionTime: execTime,
    decision
  };
}

// ----------------------------------------------------
// EDMONDS-KARP MAX FLOW ALGORITHM
// ----------------------------------------------------
export interface FlowEdgeResult {
  edgeId: string;
  source: string;
  target: string;
  flow: number;
  capacity: number;
  utilization: number; // percentage
}

export interface MaxFlowResult {
  maxFlow: number;
  edgeFlows: FlowEdgeResult[];
  bottlenecks: string[]; // Edge IDs that are fully saturated
  executionTime: number;
}

export function computeMaxFlow(
  nodes: VenueNode[],
  edges: VenueEdge[],
  sources: string[],
  sinks: string[]
): MaxFlowResult {
  const startTime = performance.now();

  // Create super-source and super-sink to handle multi-source, multi-sink
  const SUPER_SOURCE = 'SUPER_SRC';
  const SUPER_SINK = 'SUPER_SNK';

  const allNodeIds = [...nodes.map(n => n.id), SUPER_SOURCE, SUPER_SINK];
  const capacityMatrix = new Map<string, Map<string, number>>();
  const flowMatrix = new Map<string, Map<string, number>>();

  allNodeIds.forEach(u => {
    capacityMatrix.set(u, new Map<string, number>());
    flowMatrix.set(u, new Map<string, number>());
    allNodeIds.forEach(v => {
      capacityMatrix.get(u)!.set(v, 0);
      flowMatrix.get(u)!.set(v, 0);
    });
  });

  // Populate capacities from edge list
  edges.forEach(e => {
    capacityMatrix.get(e.source)!.set(e.target, e.capacity);
  });

  // Connect super source to entry gates
  sources.forEach(src => {
    capacityMatrix.get(SUPER_SOURCE)!.set(src, Infinity);
  });

  // Connect exits to super sink
  sinks.forEach(sink => {
    capacityMatrix.get(sink)!.set(SUPER_SINK, Infinity);
  });

  // BFS helper to find augmenting path in residual graph
  const findAugmentingPath = (
    parentMap: Map<string, string>
  ): number => {
    parentMap.clear();
    const visited = new Set<string>([SUPER_SOURCE]);
    const queue: string[] = [SUPER_SOURCE];

    while (queue.length > 0) {
      const u = queue.shift()!;
      if (u === SUPER_SINK) return 1; // Path found

      const neighbors = allNodeIds;
      for (const v of neighbors) {
        const residual = (capacityMatrix.get(u)!.get(v) || 0) - (flowMatrix.get(u)!.get(v) || 0);
        if (!visited.has(v) && residual > 0) {
          visited.add(v);
          parentMap.set(v, u);
          queue.push(v);
        }
      }
    }
    return 0;
  };

  const parents = new Map<string, string>();
  let maxFlow = 0;

  // Edmonds-Karp loop
  while (findAugmentingPath(parents) > 0) {
    // Find bottleneck capacity along augmenting path
    let pathFlow = Infinity;
    let curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const prev = parents.get(curr)!;
      const residual = (capacityMatrix.get(prev)!.get(curr) || 0) - (flowMatrix.get(prev)!.get(curr) || 0);
      pathFlow = Math.min(pathFlow, residual);
      curr = prev;
    }

    // Push flow
    curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const prev = parents.get(curr)!;
      const forwardFlow = flowMatrix.get(prev)!.get(curr) || 0;
      const backwardFlow = flowMatrix.get(curr)!.get(prev) || 0;

      flowMatrix.get(prev)!.set(curr, forwardFlow + pathFlow);
      flowMatrix.get(curr)!.set(prev, backwardFlow - pathFlow);
      curr = prev;
    }

    maxFlow += pathFlow;
  }

  // Map flows back to original edge structures
  const edgeFlows: FlowEdgeResult[] = edges.map(e => {
    const flow = flowMatrix.get(e.source)!.get(e.target) || 0;
    const utilization = e.capacity > 0 ? parseFloat(((flow / e.capacity) * 100).toFixed(1)) : 0;
    return {
      edgeId: e.id,
      source: e.source,
      target: e.target,
      flow,
      capacity: e.capacity,
      utilization,
    };
  });

  const bottlenecks = edgeFlows
    .filter(e => e.utilization >= 99.0)
    .map(e => e.edgeId);

  const endTime = performance.now();
  const execTime = parseFloat((endTime - startTime).toFixed(3));

  return {
    maxFlow: maxFlow === Infinity ? 0 : maxFlow,
    edgeFlows,
    bottlenecks,
    executionTime: execTime
  };
}

// ----------------------------------------------------
// MULTI-SOURCE BFS ALGORITHM
// ----------------------------------------------------
export interface BFSNodeResult {
  distance: number;
  nearestExitId: string;
}

export function runMultiSourceBFS(
  nodes: VenueNode[],
  edges: VenueEdge[],
  exits: string[]
): Map<string, BFSNodeResult> {
  const result = new Map<string, BFSNodeResult>();
  
  // Initialize BFS states
  const queue: string[] = [];
  const visited = new Set<string>();

  exits.forEach(exitId => {
    queue.push(exitId);
    visited.add(exitId);
    result.set(exitId, { distance: 0, nearestExitId: exitId });
  });

  // Build adjacency list for backward traversal (since we search exit backwards)
  const backwardAdjacency = new Map<string, string[]>();
  nodes.forEach(n => backwardAdjacency.set(n.id, []));
  edges.forEach(e => {
    // Backward direction: target -> source
    backwardAdjacency.get(e.target)?.push(e.source);
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDist = result.get(curr)!.distance;
    const nearestExit = result.get(curr)!.nearestExitId;

    const neighbors = backwardAdjacency.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        result.set(neighbor, {
          distance: currDist + 1,
          nearestExitId: nearestExit,
        });
        queue.push(neighbor);
      }
    }
  }

  // For any unreachable nodes, assign default values
  nodes.forEach(n => {
    if (!result.has(n.id)) {
      result.set(n.id, { distance: 99, nearestExitId: 'None' });
    }
  });

  return result;
}

// ----------------------------------------------------
// TOPOLOGICAL SORT ALGORITHM (KAHN'S)
// ----------------------------------------------------
export function runTopologicalSort(
  nodes: VenueNode[],
  edges: VenueEdge[]
): { order: string[]; hasCycle: boolean } {
  const nodeIds = nodes.map(n => n.id);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodeIds.forEach(id => {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  });

  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) {
      queue.push(id);
    }
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    const neighbors = adjacency.get(u) || [];
    for (const v of neighbors) {
      inDegree.set(v, (inDegree.get(v) || 0) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  const hasCycle = order.length !== nodes.length;
  return { order, hasCycle };
}

// ----------------------------------------------------
// DETAILED A* PATHFINDING ALGORITHM (FOR DAA LEARNING MODE)
// ----------------------------------------------------
import type { AStarStep } from '../types';

export function findSafestPathAStarDetailed(
  nodes: VenueNode[],
  edges: VenueEdge[],
  sourceId: string,
  targetId: string
): { steps: AStarStep[]; result: AStarResult } {
  const startTime = performance.now();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const steps: AStarStep[] = [];

  const getEdgeCost = (edge: VenueEdge): number => {
    const dest = nodeMap.get(edge.target);
    if (!dest) return edge.distance;
    const densityRatio = dest.currentDensity / dest.capacity;
    let penalty = 0;
    if (densityRatio >= 0.9) penalty = 1000.0;
    else if (densityRatio >= 0.7) penalty = 300.0;
    else if (densityRatio >= 0.5) penalty = 50.0;
    return edge.distance + penalty;
  };

  const heuristic = (uId: string, vId: string): number => {
    const u = nodeMap.get(uId);
    const v = nodeMap.get(vId);
    if (!u || !v) return 0;
    return Math.sqrt(Math.pow(u.x - v.x, 2) + Math.pow(u.y - v.y, 2));
  };

  const gScoreMap = new Map<string, number>();
  const fScoreMap = new Map<string, number>();
  const parent = new Map<string, string>();

  nodes.forEach(n => {
    gScoreMap.set(n.id, Infinity);
    fScoreMap.set(n.id, Infinity);
  });

  gScoreMap.set(sourceId, 0);
  fScoreMap.set(sourceId, heuristic(sourceId, targetId));

  const openSet = new Set<string>([sourceId]);
  const closedSet = new Set<string>();
  const visitedNodes: string[] = [];

  const getPathSoFar = (currNode: string): string[] => {
    const path: string[] = [];
    let temp = currNode;
    while (temp) {
      path.push(temp);
      temp = parent.get(temp) || '';
    }
    return path.reverse();
  };

  const serializeScores = (m: Map<string, number>): Record<string, number> => {
    const res: Record<string, number> = {};
    m.forEach((val, key) => {
      if (val !== Infinity) res[key] = parseFloat(val.toFixed(1));
    });
    return res;
  };

  const serializeParentMap = (): Record<string, string> => {
    const res: Record<string, string> = {};
    parent.forEach((val, key) => {
      res[key] = val;
    });
    return res;
  };

  while (openSet.size > 0) {
    let currentId = Array.from(openSet).reduce((minId, id) => 
      (fScoreMap.get(id) || Infinity) < (fScoreMap.get(minId) || Infinity) ? id : minId
    );

    visitedNodes.push(currentId);

    // Record Step
    const currentOpenSetList = Array.from(openSet).map(id => ({
      nodeId: id,
      g: parseFloat((gScoreMap.get(id) || 0).toFixed(1)),
      h: parseFloat(heuristic(id, targetId).toFixed(1)),
      f: parseFloat((fScoreMap.get(id) || 0).toFixed(1))
    }));

    const stepDescription = `Inspecting zone: ${nodeMap.get(currentId)?.name || currentId}. Estimated total cost f(n) = ${parseFloat((fScoreMap.get(currentId) || 0).toFixed(1))}.`;

    steps.push({
      currentNode: currentId,
      openSet: currentOpenSetList,
      closedSet: Array.from(closedSet),
      gScores: serializeScores(gScoreMap),
      hScores: serializeScores(gScoreMap), // We will populate hScores below
      fScores: serializeScores(fScoreMap),
      parentMap: serializeParentMap(),
      currentPath: getPathSoFar(currentId),
      description: stepDescription
    });

    // Populate hScores for this step
    nodes.forEach(n => {
      const hVal = heuristic(n.id, targetId);
      steps[steps.length - 1].hScores[n.id] = parseFloat(hVal.toFixed(1));
    });

    if (currentId === targetId) {
      break;
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    const outgoing = edges.filter(e => e.source === currentId);
    for (const edge of outgoing) {
      const neighborId = edge.target;
      if (closedSet.has(neighborId)) continue;

      const cost = getEdgeCost(edge);
      const tentativeGScore = (gScoreMap.get(currentId) || 0) + cost;

      if (tentativeGScore < (gScoreMap.get(neighborId) || Infinity)) {
        parent.set(neighborId, currentId);
        gScoreMap.set(neighborId, tentativeGScore);
        fScoreMap.set(neighborId, tentativeGScore + heuristic(neighborId, targetId));
        openSet.add(neighborId);
      }
    }
  }

  // Final Reconstruct path
  const path = getPathSoFar(targetId);
  const totalCost = gScoreMap.get(targetId) || 0;
  const isFound = path.length > 0 && path[0] === sourceId;

  // Add final step
  steps.push({
    currentNode: null,
    openSet: [],
    closedSet: Array.from(closedSet),
    gScores: serializeScores(gScoreMap),
    hScores: serializeScores(gScoreMap), // Dummy/unused for end step
    fScores: serializeScores(fScoreMap),
    parentMap: serializeParentMap(),
    currentPath: path,
    description: isFound 
      ? `Goal zone ${nodeMap.get(targetId)?.name || targetId} successfully reached. Optimal path locked.` 
      : 'Pathfinding search concluded: Target unreachable.'
  });

  // Populate hScores for the final step
  nodes.forEach(n => {
    const hVal = heuristic(n.id, targetId);
    steps[steps.length - 1].hScores[n.id] = parseFloat(hVal.toFixed(1));
  });

  const endTime = performance.now();
  const execTime = parseFloat((endTime - startTime).toFixed(3));

  let decision = 'Path is clear. Proceed with evacuation.';
  const congestedNodes = path.filter(id => {
    const node = nodeMap.get(id);
    return node && (node.currentDensity / node.capacity) >= 0.7;
  });
  if (congestedNodes.length > 0) {
    const nodeNames = congestedNodes.map(id => nodeMap.get(id)?.name || id).join(', ');
    decision = `Rerouted. Bypassed or minimised time through congested zones: ${nodeNames}.`;
  }

  return {
    steps,
    result: {
      path,
      totalCost: isFound ? totalCost : 0,
      visitedNodes,
      executionTime: execTime,
      decision
    }
  };
}

// ----------------------------------------------------
// DETAILED EDMONDS-KARP MAX FLOW ALGORITHM (FOR FF VISUALIZER)
// ----------------------------------------------------
import type { MaxFlowStep } from '../types';

export function computeMaxFlowDetailed(
  nodes: VenueNode[],
  edges: VenueEdge[],
  sources: string[],
  sinks: string[]
): { steps: MaxFlowStep[]; result: MaxFlowResult } {
  const startTime = performance.now();
  const steps: MaxFlowStep[] = [];

  const SUPER_SOURCE = 'SUPER_SRC';
  const SUPER_SINK = 'SUPER_SNK';

  const allNodeIds = [...nodes.map(n => n.id), SUPER_SOURCE, SUPER_SINK];
  const capacityMatrix = new Map<string, Map<string, number>>();
  const flowMatrix = new Map<string, Map<string, number>>();

  allNodeIds.forEach(u => {
    capacityMatrix.set(u, new Map<string, number>());
    flowMatrix.set(u, new Map<string, number>());
    allNodeIds.forEach(v => {
      capacityMatrix.get(u)!.set(v, 0);
      flowMatrix.get(u)!.set(v, 0);
    });
  });

  edges.forEach(e => {
    capacityMatrix.get(e.source)!.set(e.target, e.capacity);
  });

  sources.forEach(src => {
    capacityMatrix.get(SUPER_SOURCE)!.set(src, Infinity);
  });

  sinks.forEach(sink => {
    capacityMatrix.get(sink)!.set(SUPER_SINK, Infinity);
  });

  const serializeResidual = (): Record<string, Record<string, number>> => {
    const obj: Record<string, Record<string, number>> = {};
    allNodeIds.forEach(u => {
      obj[u] = {};
      allNodeIds.forEach(v => {
        const residual = (capacityMatrix.get(u)!.get(v) || 0) - (flowMatrix.get(u)!.get(v) || 0);
        if (residual > 0) {
          obj[u][v] = residual;
        }
      });
    });
    return obj;
  };

  const serializeFlows = (): Record<string, Record<string, number>> => {
    const obj: Record<string, Record<string, number>> = {};
    allNodeIds.forEach(u => {
      obj[u] = {};
      allNodeIds.forEach(v => {
        const f = flowMatrix.get(u)!.get(v) || 0;
        if (f > 0) {
          obj[u][v] = f;
        }
      });
    });
    return obj;
  };

  const findAugmentingPath = (
    parentMap: Map<string, string>
  ): number => {
    parentMap.clear();
    const visited = new Set<string>([SUPER_SOURCE]);
    const queue: string[] = [SUPER_SOURCE];

    while (queue.length > 0) {
      const u = queue.shift()!;
      if (u === SUPER_SINK) return 1;

      for (const v of allNodeIds) {
        const residual = (capacityMatrix.get(u)!.get(v) || 0) - (flowMatrix.get(u)!.get(v) || 0);
        if (!visited.has(v) && residual > 0) {
          visited.add(v);
          parentMap.set(v, u);
          queue.push(v);
        }
      }
    }
    return 0;
  };

  const parents = new Map<string, string>();
  let maxFlow = 0;
  let stepCounter = 1;

  while (findAugmentingPath(parents) > 0) {
    let pathFlow = Infinity;
    let curr = SUPER_SINK;
    const fullAugPath: string[] = [];

    while (curr) {
      fullAugPath.push(curr);
      curr = parents.get(curr) || '';
    }
    fullAugPath.reverse();

    // Find bottleneck
    curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const prev = parents.get(curr)!;
      const residual = (capacityMatrix.get(prev)!.get(curr) || 0) - (flowMatrix.get(prev)!.get(curr) || 0);
      pathFlow = Math.min(pathFlow, residual);
      curr = prev;
    }

    // Push flow
    curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const prev = parents.get(curr)!;
      const forwardFlow = flowMatrix.get(prev)!.get(curr) || 0;
      const backwardFlow = flowMatrix.get(curr)!.get(prev) || 0;

      flowMatrix.get(prev)!.set(curr, forwardFlow + pathFlow);
      flowMatrix.get(curr)!.set(prev, backwardFlow - pathFlow);
      curr = prev;
    }

    // Filter path to omit SUPER_SRC / SUPER_SNK for visual cleanliness
    const displayPath = fullAugPath.filter(x => x !== SUPER_SOURCE && x !== SUPER_SINK);

    steps.push({
      stepNumber: stepCounter++,
      augmentingPath: displayPath,
      bottleneckCapacity: pathFlow,
      residualCapacities: serializeResidual(),
      currentFlows: serializeFlows(),
      totalFlowSoFar: maxFlow + pathFlow,
      description: `Augmenting Path found: ${displayPath.join(' ➔ ')}. Bottleneck capacity = ${pathFlow} p/s. Augmented total flow.`
    });

    maxFlow += pathFlow;
  }

  // Add a final state step
  steps.push({
    stepNumber: stepCounter,
    augmentingPath: null,
    bottleneckCapacity: 0,
    residualCapacities: serializeResidual(),
    currentFlows: serializeFlows(),
    totalFlowSoFar: maxFlow,
    description: `No more augmenting paths found. Ford-Fulkerson process finalized. Max Flow = ${maxFlow} p/s.`
  });

  const edgeFlows: FlowEdgeResult[] = edges.map(e => {
    const flow = flowMatrix.get(e.source)!.get(e.target) || 0;
    const utilization = e.capacity > 0 ? parseFloat(((flow / e.capacity) * 100).toFixed(1)) : 0;
    return {
      edgeId: e.id,
      source: e.source,
      target: e.target,
      flow,
      capacity: e.capacity,
      utilization,
    };
  });

  const bottlenecks = edgeFlows
    .filter(e => e.utilization >= 99.0)
    .map(e => e.edgeId);

  const endTime = performance.now();
  const execTime = parseFloat((endTime - startTime).toFixed(3));

  return {
    steps,
    result: {
      maxFlow: maxFlow === Infinity ? 0 : maxFlow,
      edgeFlows,
      bottlenecks,
      executionTime: execTime
    }
  };
}

