#pragma once

#include <memory>
#include <vector>
#include <string>
#include "data_structures/Graph.h"

namespace EvacuGraph {

/**
 * @brief Class responsible for running evacuation routing, flow optimization, and prioritizing evacuation.
 */
class EvacuationManager {
public:
    /**
     * @brief Construct a new Evacuation Manager.
     * @param graph Shared pointer to the venue graph.
     */
    EvacuationManager(std::shared_ptr<Graph> graph);

    /**
     * @brief Mark a node ID as an emergency exit.
     */
    void addExitNode(const std::string& nodeId);

    /**
     * @brief Get list of registered exit nodes.
     */
    const std::vector<std::string>& getExitNodes() const;

    /**
     * @brief High level method to plan the evacuation.
     */
    void planEvacuation();

    /**
     * @brief Find the shortest and safest path using weight-based routing (e.g. A* Search).
     * @return Path as list of Node IDs.
     */
    std::vector<std::string> findShortestSafePath(const std::string& sourceId, const std::string& destId);

    /**
     * @brief Calculate the maximum crowd flow from a source to a sink (e.g. Ford-Fulkerson).
     */
    double calculateMaxFlow(const std::string& sourceId, const std::string& sinkId);

    /**
     * @brief Obtain topological sort order for scheduling evacuation priorities.
     */
    std::vector<std::string> getEvacuationPriorityOrder();

private:
    std::shared_ptr<Graph> graph_;
    std::vector<std::string> exitNodes_;
};

} // namespace EvacuGraph
