#include "simulation/EvacuationManager.h"
#include "algorithms/astar.h"
#include "algorithms/evacuation.h"
#include "algorithms/maxflow.h"
#include <iostream>

namespace EvacuGraph {

EvacuationManager::EvacuationManager(std::shared_ptr<Graph> graph) : graph_(graph) {}

void EvacuationManager::addExitNode(const std::string& nodeId) {
    if (graph_ && graph_->getNode(nodeId)) {
        // Prevent double additions
        for (const auto& existing : exitNodes_) {
            if (existing == nodeId) return;
        }
        exitNodes_.push_back(nodeId);
        std::cout << "[EvacuationManager] Registered Emergency Exit: " << nodeId << std::endl;
    } else {
        std::cerr << "[EvacuationManager] Error: Node " << nodeId << " not found in graph. Cannot register exit." << std::endl;
    }
}

const std::vector<std::string>& EvacuationManager::getExitNodes() const {
    return exitNodes_;
}

void EvacuationManager::planEvacuation() {
    std::cout << "[EvacuationManager] Planning evacuation routes (System-wide schedule):" << std::endl;
    if (exitNodes_.empty()) {
        std::cout << "  WARNING: No exit nodes registered!" << std::endl;
        return;
    }
    
    // Simulating checking closest exit for each active zone
    for (const auto& [nodeId, node] : graph_->getAllNodes()) {
        if (node->getType() == NodeType::EVENT_ZONE || node->getType() == NodeType::HALL) {
            std::cout << "  - Zone [" << nodeId << "] -> Checking pathways to exits..." << std::endl;
            for (const auto& exitId : exitNodes_) {
                auto path = findShortestSafePath(nodeId, exitId);
                std::cout << "    * Exit [" << exitId << "] path: ";
                for (size_t i = 0; i < path.size(); ++i) {
                    std::cout << path[i] << (i + 1 < path.size() ? " -> " : "");
                }
                std::cout << std::endl;
            }
        }
    }
}

std::vector<std::string> EvacuationManager::findShortestSafePath(const std::string& sourceId, const std::string& destId) {
    if (!graph_) return {};
    AStarResult result = findSafestPathAStar(graph_, sourceId, destId);
    std::vector<std::string> path;
    for (const auto& node : result.path) {
        path.push_back(node->getId());
    }
    return path;
}

double EvacuationManager::calculateMaxFlow(const std::string& sourceId, const std::string& sinkId) {
    if (!graph_) return 0.0;
    std::vector<std::string> entries = {sourceId};
    std::vector<std::string> exits = {sinkId};
    MaxFlowResult result = computeMaxFlow(graph_, entries, exits);
    return result.maxFlow;
}

std::vector<std::string> EvacuationManager::getEvacuationPriorityOrder() {
    if (!graph_) return {};
    bool hasCycle = false;
    return runTopologicalSort(graph_, hasCycle);
}

} // namespace EvacuGraph
