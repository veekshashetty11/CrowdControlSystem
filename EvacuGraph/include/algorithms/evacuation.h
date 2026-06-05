#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include <memory>
#include "data_structures/Graph.h"

namespace EvacuGraph {

/**
 * @brief Structure storing results of Multi-Source BFS.
 */
struct BFSResultEntry {
    std::string nearestExitId; // ID of the closest exit node
    int distance;              // Hop-distance to that exit
};

/**
 * @brief Run a Multi-Source BFS starting simultaneously from all registered exit nodes.
 * Walks backward along the graph's connections (by reversing edge directions dynamically)
 * to find the nearest exit and corresponding hop-distance for every node.
 * 
 * @param graph Shared pointer to the venue graph.
 * @param exits Vector of IDs representing emergency exits.
 * @return Map of node ID to its BFSResultEntry.
 */
std::unordered_map<std::string, BFSResultEntry> runMultiSourceBFS(
    std::shared_ptr<Graph> graph,
    const std::vector<std::string>& exits
);

/**
 * @brief Compute topological sort ordering of nodes in the venue layout graph.
 * Determines the evacuation priority flow sequence (using Kahn's algorithm).
 * 
 * @param graph Shared pointer to the venue graph.
 * @param hasCycle Reference output boolean set to true if a cycle is detected (not a DAG).
 * @return Ordered list of node IDs.
 */
std::vector<std::string> runTopologicalSort(
    std::shared_ptr<Graph> graph,
    bool& hasCycle
);

} // namespace EvacuGraph
