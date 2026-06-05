#include "algorithms/evacuation.h"
#include <queue>
#include <unordered_set>
#include <iostream>

namespace EvacuGraph {

std::unordered_map<std::string, BFSResultEntry> runMultiSourceBFS(
    std::shared_ptr<Graph> graph,
    const std::vector<std::string>& exits
) {
    std::unordered_map<std::string, BFSResultEntry> result;
    if (!graph || exits.empty()) return result;

    // 1. Initialize result structure for all nodes to unvisited state
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        result[nodeId] = {"None", -1}; 
    }

    // 2. Build reversed adjacency list dynamically (so we walk backwards from exits)
    std::unordered_map<std::string, std::vector<std::string>> reverseAdj;
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        for (const auto& edge : graph->getOutgoingEdges(nodeId)) {
            std::string dest = edge->getDestination()->getId();
            reverseAdj[dest].push_back(nodeId);
        }
    }

    // 3. Queue for BFS exploration and visited set
    std::queue<std::string> q;
    std::unordered_set<std::string> visited;

    // 4. Initialize BFS queue with all exits
    for (const std::string& exitId : exits) {
        if (graph->getNode(exitId) != nullptr) {
            q.push(exitId);
            visited.insert(exitId);
            result[exitId] = {exitId, 0}; // Distance to itself is 0 hops
        }
    }

    // 5. Standard BFS traversal on dynamically reversed graph
    while (!q.empty()) {
        std::string curr = q.front();
        q.pop();

        int currDist = result[curr].distance;
        std::string currExit = result[curr].nearestExitId;

        // Traverse backwards to incoming neighbors
        auto it = reverseAdj.find(curr);
        if (it != reverseAdj.end()) {
            for (const std::string& prevId : it->second) {
                // If not visited yet, record closest exit and distance, and queue it
                if (visited.find(prevId) == visited.end()) {
                    visited.insert(prevId);
                    result[prevId] = {currExit, currDist + 1};
                    q.push(prevId);
                }
            }
        }
    }

    return result;
}

std::vector<std::string> runTopologicalSort(
    std::shared_ptr<Graph> graph,
    bool& hasCycle
) {
    std::vector<std::string> order;
    hasCycle = false;
    if (!graph) return order;

    // 1. Compute in-degrees for all nodes
    std::unordered_map<std::string, int> inDegrees;
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        inDegrees[nodeId] = 0;
    }

    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        for (const auto& edge : graph->getOutgoingEdges(nodeId)) {
            std::string destId = edge->getDestination()->getId();
            inDegrees[destId]++;
        }
    }

    // 2. Queue for Kahn's algorithm (all nodes with in-degree 0)
    std::queue<std::string> q;
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        if (inDegrees[nodeId] == 0) {
            q.push(nodeId);
        }
    }

    // 3. Process the queue to build topological sort order
    while (!q.empty()) {
        std::string curr = q.front();
        q.pop();
        order.push_back(curr);

        for (const auto& edge : graph->getOutgoingEdges(curr)) {
            std::string destId = edge->getDestination()->getId();
            inDegrees[destId]--;
            if (inDegrees[destId] == 0) {
                q.push(destId);
            }
        }
    }

    // 4. If processed count doesn't match total nodes, there is a cycle (graph is not a DAG)
    if (order.size() != graph->getAllNodes().size()) {
        hasCycle = true;
    }

    return order;
}

} // namespace EvacuGraph
