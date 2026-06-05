#include "algorithms/astar.h"
#include <cmath>
#include <queue>
#include <unordered_map>
#include <limits>
#include <algorithm>
#include <iostream>

namespace EvacuGraph {

/**
 * @brief Calculate the Euclidean distance heuristic between two nodes.
 * Used by A* search to guide exploration towards the destination.
 */
double calculateHeuristic(std::shared_ptr<Node> u, std::shared_ptr<Node> v) {
    if (!u || !v) return 0.0;
    
    // Formula: sqrt((x1 - x2)^2 + (y1 - y2)^2)
    double dx = u->getX() - v->getX();
    double dy = u->getY() - v->getY();
    return std::sqrt(dx * dx + dy * dy);
}

/**
 * @brief Internal state tracked in the priority queue for A* exploration.
 */
struct AStarState {
    std::shared_ptr<Node> node;
    double gCost; // Actual path cost from start node to this node
    double fCost; // Total estimated cost: gCost + hCost (heuristic to target)

    // Overload operator> to create a min-heap inside std::priority_queue
    bool operator>(const AStarState& other) const {
        return fCost > other.fCost;
    }
};

AStarResult findSafestPathAStar(
    std::shared_ptr<Graph> graph,
    const std::string& startId,
    const std::string& targetId
) {
    AStarResult result;
    result.totalCost = std::numeric_limits<double>::infinity();

    if (!graph) return result;

    auto startNode = graph->getNode(startId);
    auto targetNode = graph->getNode(targetId);

    if (!startNode || !targetNode) {
        std::cerr << "[A* Error] Start node \"" << startId 
                  << "\" or target node \"" << targetId << "\" not found." << std::endl;
        return result;
    }

    // Min-priority queue containing exploration states
    std::priority_queue<AStarState, std::vector<AStarState>, std::greater<AStarState>> pq;

    // Track the lowest actual cost (gCost) found to reach each node
    std::unordered_map<std::string, double> gCosts;
    for (const auto& [nodeId, node] : graph->getAllNodes()) {
        gCosts[nodeId] = std::numeric_limits<double>::infinity();
    }

    // Track parent nodes to reconstruct the optimal route path afterwards
    std::unordered_map<std::string, std::shared_ptr<Node>> parents;

    // Track fully expanded nodes to prevent reprocessing
    std::unordered_map<std::string, bool> visited;

    // Initialize search from the start node
    gCosts[startId] = 0.0;
    double initialH = calculateHeuristic(startNode, targetNode);
    pq.push({startNode, 0.0, initialH});

    bool foundTarget = false;

    while (!pq.empty()) {
        // Pop the state with the lowest estimated total cost (fCost)
        AStarState current = pq.top();
        pq.pop();

        std::string currId = current.node->getId();

        // Skip if this node has already been visited/expanded
        if (visited[currId]) continue;
        visited[currId] = true;

        // Log node visit sequence for DAA analysis
        result.visitedNodes.push_back(currId);

        // If target node is reached, complete search
        if (currId == targetId) {
            foundTarget = true;
            break;
        }

        // Explore outgoing pathways from the current node
        for (const auto& edge : graph->getOutgoingEdges(currId)) {
            auto neighbor = edge->getDestination();
            if (!neighbor) continue;

            std::string neighborId = neighbor->getId();
            if (visited[neighborId]) continue;

            // Route cost: cost = distance + density_penalty
            // density_penalty is the current crowd count on the destination node
            double densityPenalty = neighbor->getCurrentDensity();
            double edgeCost = edge->getDistance() + densityPenalty;

            double tentativeG = current.gCost + edgeCost;

            // If a cheaper route to this neighbor is discovered, update state
            if (tentativeG < gCosts[neighborId]) {
                gCosts[neighborId] = tentativeG;
                parents[neighborId] = current.node;
                
                double hCost = calculateHeuristic(neighbor, targetNode);
                double fCost = tentativeG + hCost;
                
                pq.push({neighbor, tentativeG, fCost});
            }
        }
    }

    // Reconstruct path backward if the target exit was successfully reached
    if (foundTarget) {
        result.totalCost = gCosts[targetId];
        
        std::shared_ptr<Node> curr = targetNode;
        while (curr != nullptr) {
            result.path.push_back(curr);
            auto it = parents.find(curr->getId());
            if (it != parents.end()) {
                curr = it->second;
            } else {
                curr = nullptr;
            }
        }
        
        // Reverse path order to map from start node to target node
        std::reverse(result.path.begin(), result.path.end());
    }

    return result;
}

} // namespace EvacuGraph
