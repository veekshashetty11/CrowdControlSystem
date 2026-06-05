#include "data_structures/Graph.h"
#include <iostream>

namespace EvacuGraph {

void Graph::addNode(std::shared_ptr<Node> node) {
    if (node) {
        nodes_[node->getId()] = node;
    }
}

void Graph::addEdge(std::shared_ptr<Edge> edge) {
    if (edge && edge->getSource()) {
        edges_[edge->getId()] = edge;
        adjacencyList_[edge->getSource()->getId()].push_back(edge);
    }
}

void Graph::removeNode(const std::string& nodeId) {
    // 1. Remove the node itself
    auto nodeIt = nodes_.find(nodeId);
    if (nodeIt == nodes_.end()) return;
    nodes_.erase(nodeIt);

    // 2. Remove all outgoing edges from this node from the master edges list
    auto adjIt = adjacencyList_.find(nodeId);
    if (adjIt != adjacencyList_.end()) {
        for (const auto& edge : adjIt->second) {
            edges_.erase(edge->getId());
        }
        adjacencyList_.erase(adjIt);
    }

    // 3. Remove all incoming edges pointing to this node
    for (auto& [srcId, edgeList] : adjacencyList_) {
        for (auto edgeIt = edgeList.begin(); edgeIt != edgeList.end(); ) {
            if ((*edgeIt)->getDestination()->getId() == nodeId) {
                edges_.erase((*edgeIt)->getId());
                edgeIt = edgeList.erase(edgeIt);
            } else {
                ++edgeIt;
            }
        }
    }
}

void Graph::removeEdge(const std::string& edgeId) {
    auto edgeIt = edges_.find(edgeId);
    if (edgeIt == edges_.end()) return;
    
    std::string sourceId = edgeIt->second->getSource()->getId();
    edges_.erase(edgeIt);

    auto adjIt = adjacencyList_.find(sourceId);
    if (adjIt != adjacencyList_.end()) {
        auto& edgeList = adjIt->second;
        for (auto it = edgeList.begin(); it != edgeList.end(); ++it) {
            if ((*it)->getId() == edgeId) {
                edgeList.erase(it);
                break;
            }
        }
        if (edgeList.empty()) {
            adjacencyList_.erase(adjIt);
        }
    }
}

std::shared_ptr<Node> Graph::getNode(const std::string& id) const {
    auto it = nodes_.find(id);
    if (it != nodes_.end()) {
        return it->second;
    }
    return nullptr;
}

std::shared_ptr<Edge> Graph::getEdge(const std::string& id) const {
    auto it = edges_.find(id);
    if (it != edges_.end()) {
        return it->second;
    }
    return nullptr;
}

const std::unordered_map<std::string, std::shared_ptr<Node>>& Graph::getAllNodes() const {
    return nodes_;
}

const std::unordered_map<std::string, std::vector<std::shared_ptr<Edge>>>& Graph::getAdjacencyList() const {
    return adjacencyList_;
}

std::vector<std::shared_ptr<Edge>> Graph::getOutgoingEdges(const std::string& nodeId) const {
    auto it = adjacencyList_.find(nodeId);
    if (it != adjacencyList_.end()) {
        return it->second;
    }
    return {};
}

std::vector<std::shared_ptr<Node>> Graph::getNeighbors(const std::string& nodeId) const {
    std::vector<std::shared_ptr<Node>> neighbors;
    auto it = adjacencyList_.find(nodeId);
    if (it != adjacencyList_.end()) {
        for (const auto& edge : it->second) {
            if (edge && edge->getDestination()) {
                neighbors.push_back(edge->getDestination());
            }
        }
    }
    return neighbors;
}

void Graph::printGraph() const {
    std::cout << "\n================= EvacuGraph Venue Layout =================" << std::endl;
    for (const auto& [nodeId, node] : nodes_) {
        std::cout << "Node: " << nodeId << " | \"" << node->getName() << "\" [" << node->getTypeString() 
                  << "] | Capacity: " << node->getCapacity() << " | Current Density: " << node->getCurrentDensity() << std::endl;
        
        auto outgoing = getOutgoingEdges(nodeId);
        if (outgoing.empty()) {
            std::cout << "  (No outgoing pathways)" << std::endl;
        } else {
            for (const auto& edge : outgoing) {
                std::cout << "  --> Pathway: " << edge->getId() << " to [" << edge->getDestination()->getId() 
                          << "] | Distance: " << edge->getDistance() << " | Capacity: " << edge->getCapacity() 
                          << " | Flow: " << edge->getCurrentFlow() << " | Dynamic Weight: " << edge->getWeight() << std::endl;
            }
        }
    }
    std::cout << "===========================================================\n" << std::endl;
}

} // namespace EvacuGraph
