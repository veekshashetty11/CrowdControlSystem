#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include <memory>
#include "data_structures/Graph.h"

namespace EvacuGraph {

/**
 * @brief Structure storing flow and utilization details for a single pathway.
 */
struct FlowEdgeInfo {
    std::string edgeId;         // Unique ID of the corridor edge
    std::string sourceName;     // Human-readable source node name
    std::string destName;       // Human-readable destination node name
    double capacity;            // Max flow capacity of the corridor
    double flow;                // Calculated actual flow traversing the corridor
    double utilization;         // Percentage utilization: (flow / capacity) * 100
};

/**
 * @brief Structure returning the final Maximum Flow results.
 */
struct MaxFlowResult {
    double maxFlow;                         // Total capacity of the network from sources to exits
    std::vector<FlowEdgeInfo> edgeFlows;    // Flow metrics for all pathways in the graph
    std::vector<FlowEdgeInfo> bottlenecks;  // Saturated pathways where utilization is ~100%
};

/**
 * @brief Computes maximum crowd flow capacity of the venue layout graph.
 * Connects entry gates to a virtual super-source, and exits to a virtual super-sink.
 * Employs the Edmonds-Karp implementation of the Ford-Fulkerson algorithm.
 * 
 * @param graph Shared pointer to the venue graph.
 * @param entries Vector of IDs representing entrance gates.
 * @param exits Vector of IDs representing exit nodes.
 * @return MaxFlowResult containing total capacity, corridor usage, and bottlenecks.
 */
MaxFlowResult computeMaxFlow(
    std::shared_ptr<Graph> graph,
    const std::vector<std::string>& entries,
    const std::vector<std::string>& exits
);

} // namespace EvacuGraph
