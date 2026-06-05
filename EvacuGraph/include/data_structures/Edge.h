#pragma once

#include <string>
#include <memory>
#include "data_structures/Node.h"

namespace EvacuGraph {

/**
 * @brief Class representing a pathway or corridor connecting two locations.
 */
class Edge {
public:
    /**
     * @brief Construct a new Edge object.
     * @param id Unique identifier for the edge.
     * @param source Pointer to the origin node.
     * @param destination Pointer to the destination node.
     * @param capacity The maximum flow rate (people/minute or concurrent count).
     * @param distance Physical length of the path.
     */
    Edge(const std::string& id, std::shared_ptr<Node> source, std::shared_ptr<Node> destination, double capacity, double distance);

    // Getters and Setters
    std::string getId() const;
    std::shared_ptr<Node> getSource() const;
    std::shared_ptr<Node> getDestination() const;
    double getCapacity() const;
    double getDistance() const;
    double getCurrentFlow() const;
    void setCurrentFlow(double flow);
    double getWeight() const;
    void setWeight(double weight);

    /**
     * @brief Dynamic weight calculation combining physical distance and target congestion.
     */
    void updateDynamicWeight();

private:
    std::string id_;
    std::shared_ptr<Node> source_;
    std::shared_ptr<Node> destination_;
    double capacity_;
    double distance_;
    double currentFlow_;
    double weight_; // Dynamic edge weight used for route calculations (e.g. travel time)
};

} // namespace EvacuGraph
