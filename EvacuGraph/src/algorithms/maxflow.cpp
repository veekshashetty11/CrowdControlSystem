#include "algorithms/maxflow.h"
#include <queue>
#include <unordered_set>
#include <unordered_map>
#include <algorithm>
#include <iostream>
#include <limits>

namespace EvacuGraph {

// Special internal tokens representing virtual super source/sink
const std::string SUPER_SOURCE = "__SuperSource__";
const std::string SUPER_SINK = "__SuperSink__";

MaxFlowResult computeMaxFlow(
    std::shared_ptr<Graph> graph,
    const std::vector<std::string>& entries,
    const std::vector<std::string>& exits
) {
    MaxFlowResult result;
    result.maxFlow = 0.0;
    if (!graph || entries.empty() || exits.empty()) return result;

    // 1. Setup residual capacities map
    // residualCap[u][v] represents remaining capacity from u to v
    std::unordered_map<std::string, std::unordered_map<std::string, double>> residualCap;

    // Populate residual graph with original graph directed edges
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        for (const auto& edge : graph->getOutgoingEdges(nodeId)) {
            std::string src = nodeId;
            std::string dest = edge->getDestination()->getId();
            double cap = edge->getCapacity();

            residualCap[src][dest] = cap;
            // Ensure reverse edge exists with 0 capacity initially
            if (residualCap[dest].find(src) == residualCap[dest].end()) {
                residualCap[dest][src] = 0.0;
            }
        }
    }

    // Connect virtual SUPER_SOURCE to entry gates
    for (const std::string& entryId : entries) {
        auto entryNode = graph->getNode(entryId);
        if (entryNode) {
            // Constrain entry capacity
            residualCap[SUPER_SOURCE][entryId] = entryNode->getCapacity();
            residualCap[entryId][SUPER_SOURCE] = 0.0;
        }
    }

    // Connect exits to virtual SUPER_SINK
    for (const std::string& exitId : exits) {
        auto exitNode = graph->getNode(exitId);
        if (exitNode) {
            // Constrain exit capacity
            residualCap[exitId][SUPER_SINK] = exitNode->getCapacity();
            residualCap[SUPER_SINK][exitId] = 0.0;
        }
    }

    // 2. Edmonds-Karp BFS loop to find shortest path in residual graph
    const double EPSILON = 1e-9;
    double maxFlowVal = 0.0;

    while (true) {
        // BFS to locate augmenting path
        std::queue<std::string> q;
        std::unordered_map<std::string, std::string> parent;
        
        q.push(SUPER_SOURCE);
        parent[SUPER_SOURCE] = ""; // Root parent marker

        bool pathFound = false;

        while (!q.empty()) {
            std::string curr = q.front();
            q.pop();

            if (curr == SUPER_SINK) {
                pathFound = true;
                break;
            }

            auto it = residualCap.find(curr);
            if (it != residualCap.end()) {
                for (const auto& [next, cap] : it->second) {
                    if (cap > EPSILON && parent.find(next) == parent.end()) {
                        parent[next] = curr;
                        q.push(next);
                    }
                }
            }
        }

        // If no augmenting path exists, max flow is found
        if (!pathFound) break;

        // Reconstruct path to find bottleneck capacity
        double bottleneck = std::numeric_limits<double>::infinity();
        std::string curr = SUPER_SINK;
        while (curr != SUPER_SOURCE) {
            std::string prev = parent[curr];
            bottleneck = std::min(bottleneck, residualCap[prev][curr]);
            curr = prev;
        }

        // Apply bottleneck flow along path to residual network
        curr = SUPER_SINK;
        while (curr != SUPER_SOURCE) {
            std::string prev = parent[curr];
            residualCap[prev][curr] -= bottleneck;
            residualCap[curr][prev] += bottleneck;
            curr = prev;
        }

        maxFlowVal += bottleneck;
    }

    result.maxFlow = maxFlowVal;

    // 3. Build edge flows report and extract bottlenecks
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        for (const auto& edge : graph->getOutgoingEdges(nodeId)) {
            std::string src = nodeId;
            std::string dest = edge->getDestination()->getId();
            double cap = edge->getCapacity();
            
            // Flow sent is equivalent to residual capacity of the reverse edge
            double flow = residualCap[dest][src];
            if (flow < EPSILON) flow = 0.0;

            double util = 0.0;
            if (cap > EPSILON) {
                util = (flow / cap) * 100.0;
            }

            FlowEdgeInfo info = {
                edge->getId(),
                node->getName(),
                edge->getDestination()->getName(),
                cap,
                flow,
                util
            };

            result.edgeFlows.push_back(info);

            // Saturated edge identification (utilization ~100%)
            if (util >= 99.9) {
                result.bottlenecks.push_back(info);
            }
        }
    }

    return result;
}

} // namespace EvacuGraph
