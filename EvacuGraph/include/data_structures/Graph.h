#pragma once

#include <vector>
#include <unordered_map>
#include <memory>
#include "data_structures/Node.h"
#include "data_structures/Edge.h"

namespace EvacuGraph {

/**
 * @brief Class representing the venue layout as a directed weighted graph.
 */
class Graph {
public:
    Graph() = default;

    /**
     * @brief Add a node to the graph.
     */
    void addNode(std::shared_ptr<Node> node);

    /**
     * @brief Remove a node from the graph and clean up all associated edges.
     */
    void removeNode(const std::string& nodeId);

    /**
     * @brief Add a directed edge to the graph.
     */
    void addEdge(std::shared_ptr<Edge> edge);

    /**
     * @brief Remove a directed edge from the graph.
     */
    void removeEdge(const std::string& edgeId);

    /**
     * @brief Get a node by its ID.
     * @return std::shared_ptr<Node> Pointer to the node, or nullptr if not found.
     */
    std::shared_ptr<Node> getNode(const std::string& id) const;

    /**
     * @brief Get an edge by its ID.
     * @return std::shared_ptr<Edge> Pointer to the edge, or nullptr if not found.
     */
    std::shared_ptr<Edge> getEdge(const std::string& id) const;

    /**
     * @brief Get all nodes in the graph.
     */
    const std::unordered_map<std::string, std::shared_ptr<Node>>& getAllNodes() const;

    /**
     * @brief Get the full adjacency list.
     */
    const std::unordered_map<std::string, std::vector<std::shared_ptr<Edge>>>& getAdjacencyList() const;
    
    /**
     * @brief Get outgoing edges from a specific node.
     */
    std::vector<std::shared_ptr<Edge>> getOutgoingEdges(const std::string& nodeId) const;

    /**
     * @brief Get the list of adjacent destination nodes for a given node.
     */
    std::vector<std::shared_ptr<Node>> getNeighbors(const std::string& nodeId) const;

    /**
     * @brief Display graph details to console.
     */
    void printGraph() const;

private:
    std::unordered_map<std::string, std::shared_ptr<Node>> nodes_;
    std::unordered_map<std::string, std::shared_ptr<Edge>> edges_;
    std::unordered_map<std::string, std::vector<std::shared_ptr<Edge>>> adjacencyList_; // key: source node ID, value: list of outgoing edges
};

} // namespace evacugraph
