#include "data_structures/Edge.h"

namespace EvacuGraph {

Edge::Edge(const std::string& id, std::shared_ptr<Node> source, std::shared_ptr<Node> destination, double capacity, double distance)
    : id_(id), source_(source), destination_(destination), capacity_(capacity), distance_(distance), currentFlow_(0.0), weight_(distance) {
    updateDynamicWeight();
}

std::string Edge::getId() const {
    return id_;
}

std::shared_ptr<Node> Edge::getSource() const {
    return source_;
}

std::shared_ptr<Node> Edge::getDestination() const {
    return destination_;
}

double Edge::getCapacity() const {
    return capacity_;
}

double Edge::getDistance() const {
    return distance_;
}

double Edge::getCurrentFlow() const {
    return currentFlow_;
}

void Edge::setCurrentFlow(double flow) {
    currentFlow_ = flow;
    updateDynamicWeight();
}

double Edge::getWeight() const {
    return weight_;
}

void Edge::setWeight(double weight) {
    weight_ = weight;
}

void Edge::updateDynamicWeight() {
    // Dynamic weight is calculated by scaling the base distance by a congestion factor.
    // If the destination node is congested, the weight increases to represent slower travel.
    if (destination_) {
        double density = destination_->getCurrentDensity();
        double cap = destination_->getCapacity();
        double densityRatio = (cap > 0.0) ? (density / cap) : 0.0;
        
        // Weight scales up with congestion (e.g. up to 3x standard distance if capacity exceeded)
        weight_ = distance_ * (1.0 + densityRatio * 2.0);
    } else {
        weight_ = distance_;
    }
}

} // namespace EvacuGraph
