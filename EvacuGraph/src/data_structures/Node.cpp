#include "data_structures/Node.h"

namespace EvacuGraph {

Node::Node(const std::string& id, const std::string& name, NodeType type, double capacity, double x, double y)
    : id_(id), name_(name), type_(type), capacity_(capacity), currentDensity_(0.0), x_(x), y_(y) {}

std::string Node::getId() const {
    return id_;
}

std::string Node::getName() const {
    return name_;
}

NodeType Node::getType() const {
    return type_;
}

std::string Node::getTypeString() const {
    switch (type_) {
        case NodeType::ENTRY_GATE:
            return "ENTRY_GATE";
        case NodeType::CORRIDOR:
            return "CORRIDOR";
        case NodeType::EVENT_ZONE:
            return "EVENT_ZONE";
        case NodeType::HALL:
            return "HALL";
        case NodeType::EMERGENCY_EXIT:
            return "EMERGENCY_EXIT";
    }
    return "UNKNOWN";
}

double Node::getCapacity() const {
    return capacity_;
}

double Node::getCurrentDensity() const {
    return currentDensity_;
}

void Node::setCurrentDensity(double density) {
    currentDensity_ = density;
}

double Node::getX() const {
    return x_;
}

double Node::getY() const {
    return y_;
}

} // namespace EvacuGraph
