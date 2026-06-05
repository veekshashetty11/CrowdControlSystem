#pragma once

#include <vector>
#include <string>
#include <memory>
#include "data_structures/Graph.h"
#include "data_structures/Node.h"

namespace EvacuGraph {

/**
 * @brief Structure returned by the A* Search algorithm.
 */
struct AStarResult {
    std::vector<std::shared_ptr<Node>> path;    // The nodes along the safest route from start to target
    double totalCost;                           // Cumulative congestion-aware cost of the path
    std::vector<std::string> visitedNodes;      // The order in which nodes were visited during search (for analysis)
};

/**
 * @brief Find the safest, shortest congestion-aware route using the A* Search algorithm.
 * 
 * Cost definition: cost = distance + density_penalty (current density of destination node)
 * Heuristic: Euclidean distance between node (x, y) coordinates.
 * 
 * @param graph Shared pointer to the venue Graph.
 * @param startId Unique ID of the starting location.
 * @param targetId Unique ID of the destination exit/location.
 * @return AStarResult contains the path, total cost, and visited nodes list.
 */
AStarResult findSafestPathAStar(
    std::shared_ptr<Graph> graph,
    const std::string& startId,
    const std::string& targetId
);

} // namespace EvacuGraph
