#pragma once

#include <string>

namespace EvacuGraph {

/**
 * @brief Enum representing different types of nodes within a venue graph.
 */
enum class NodeType {
    ENTRY_GATE,
    CORRIDOR,
    EVENT_ZONE,
    HALL,
    EMERGENCY_EXIT
};

/**
 * @brief Class representing a physical location or zone in the venue.
 */
class Node {
public:
    /**
     * @brief Construct a new Node object.
     * @param id Unique identifier for the node.
     * @param name Human-readable name of the location.
     * @param type The type of location (e.g. EXIT, HALL).
     * @param capacity The maximum crowd capacity of the location.
     * @param x X coordinate (for mapping/heatmap generation).
     * @param y Y coordinate (for mapping/heatmap generation).
     */
    Node(const std::string& id, const std::string& name, NodeType type, double capacity, double x = 0.0, double y = 0.0);

    // Getters and Setters
    std::string getId() const;
    std::string getName() const;
    NodeType getType() const;
    std::string getTypeString() const;
    double getCapacity() const;
    double getCurrentDensity() const;
    void setCurrentDensity(double density);
    double getX() const;
    double getY() const;

private:
    std::string id_;
    std::string name_;
    NodeType type_;
    double capacity_;
    double currentDensity_; // Representing current number of people or ratio
    double x_;
    double y_;
};

} // namespace EvacuGraph
