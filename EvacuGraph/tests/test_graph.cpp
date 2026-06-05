#include <iostream>
#include <cassert>
#include <memory>
#include <vector>
#include "data_structures/Node.h"
#include "data_structures/Edge.h"
#include "data_structures/Graph.h"

using namespace EvacuGraph;

void testAddAndGetNode() {
    std::cout << "  - Running testAddAndGetNode..." << std::endl;
    Graph g;
    auto node = std::make_shared<Node>("Node_1", "Test Node", NodeType::HALL, 100.0);
    g.addNode(node);

    assert(g.getNode("Node_1") != nullptr);
    assert(g.getNode("Node_1")->getName() == "Test Node");
    assert(g.getNode("Node_2") == nullptr);
    assert(g.getAllNodes().size() == 1);
    std::cout << "    * Passed!" << std::endl;
}

void testAddAndRemoveEdge() {
    std::cout << "  - Running testAddAndRemoveEdge..." << std::endl;
    Graph g;
    auto node1 = std::make_shared<Node>("N1", "Source Node", NodeType::HALL, 100.0);
    auto node2 = std::make_shared<Node>("N2", "Dest Node", NodeType::CORRIDOR, 50.0);
    g.addNode(node1);
    g.addNode(node2);

    auto edge = std::make_shared<Edge>("E1", node1, node2, 10.0, 5.0);
    g.addEdge(edge);

    assert(g.getEdge("E1") != nullptr);
    assert(g.getOutgoingEdges("N1").size() == 1);

    // Get neighbors
    auto neighbors = g.getNeighbors("N1");
    assert(neighbors.size() == 1);
    assert(neighbors[0]->getId() == "N2");

    // Remove edge
    g.removeEdge("E1");
    assert(g.getEdge("E1") == nullptr);
    assert(g.getOutgoingEdges("N1").empty());
    assert(g.getNeighbors("N1").empty());
    std::cout << "    * Passed!" << std::endl;
}

void testRemoveNodeWithEdges() {
    std::cout << "  - Running testRemoveNodeWithEdges..." << std::endl;
    Graph g;
    auto node1 = std::make_shared<Node>("N1", "Source Node", NodeType::HALL, 100.0);
    auto node2 = std::make_shared<Node>("N2", "Dest Node", NodeType::CORRIDOR, 50.0);
    g.addNode(node1);
    g.addNode(node2);

    auto edge = std::make_shared<Edge>("E1", node1, node2, 10.0, 5.0);
    g.addEdge(edge);

    // Remove source node. This should delete E1 as well
    g.removeNode("N1");
    assert(g.getNode("N1") == nullptr);
    assert(g.getEdge("E1") == nullptr);
    assert(g.getOutgoingEdges("N1").empty());
    assert(g.getNode("N2") != nullptr); // N2 is untouched

    // Re-setup to test deletion of destination node (incoming edge clean up)
    g.addNode(node1);
    auto edge2 = std::make_shared<Edge>("E2", node1, node2, 10.0, 5.0);
    g.addEdge(edge2);

    assert(g.getEdge("E2") != nullptr);
    assert(g.getOutgoingEdges("N1").size() == 1);

    // Remove destination node N2. E2 should be deleted.
    g.removeNode("N2");
    assert(g.getNode("N2") == nullptr);
    assert(g.getEdge("E2") == nullptr);
    assert(g.getOutgoingEdges("N1").empty());
    std::cout << "    * Passed!" << std::endl;
}

int main() {
    std::cout << "\033[1;35m";
    std::cout << "====================================================\n";
    std::cout << "      EvacuGraph: Running Graph Engine Tests        \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";

    testAddAndGetNode();
    testAddAndRemoveEdge();
    testRemoveNodeWithEdges();

    std::cout << "\033[1;32m";
    std::cout << "\n====================================================\n";
    std::cout << "       ALL TESTS COMPLETED SUCCESSFULLY!            \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";
    return 0;
}
