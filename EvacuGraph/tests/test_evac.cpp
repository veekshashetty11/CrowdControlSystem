#include <iostream>
#include <cassert>
#include <memory>
#include <vector>
#include "data_structures/Node.h"
#include "data_structures/Edge.h"
#include "data_structures/Graph.h"
#include "algorithms/evacuation.h"

using namespace EvacuGraph;

void testMultiSourceBFS() {
    std::cout << "  - Running testMultiSourceBFS..." << std::endl;
    auto g = std::make_shared<Graph>();

    auto n1 = std::make_shared<Node>("N1", "Hall 1", NodeType::HALL, 100);
    auto n2 = std::make_shared<Node>("N2", "Corridor 1", NodeType::CORRIDOR, 100);
    auto n3 = std::make_shared<Node>("N3", "Hall 2", NodeType::HALL, 100);
    auto exit1 = std::make_shared<Node>("Exit1", "Exit 1", NodeType::EMERGENCY_EXIT, 100);
    auto exit2 = std::make_shared<Node>("Exit2", "Exit 2", NodeType::EMERGENCY_EXIT, 100);

    g->addNode(n1);
    g->addNode(n2);
    g->addNode(n3);
    g->addNode(exit1);
    g->addNode(exit2);

    // N1 -> N2 -> Exit1
    g->addEdge(std::make_shared<Edge>("E1", n1, n2, 10, 10));
    g->addEdge(std::make_shared<Edge>("E2", n2, exit1, 10, 10));

    // N3 -> Exit2
    g->addEdge(std::make_shared<Edge>("E3", n3, exit2, 10, 10));

    std::vector<std::string> exits = {"Exit1", "Exit2"};
    auto results = runMultiSourceBFS(g, exits);

    // Assert nearest exits and distances
    assert(results["Exit1"].nearestExitId == "Exit1");
    assert(results["Exit1"].distance == 0);

    assert(results["Exit2"].nearestExitId == "Exit2");
    assert(results["Exit2"].distance == 0);

    assert(results["N2"].nearestExitId == "Exit1");
    assert(results["N2"].distance == 1);

    assert(results["N1"].nearestExitId == "Exit1");
    assert(results["N1"].distance == 2);

    assert(results["N3"].nearestExitId == "Exit2");
    assert(results["N3"].distance == 1);

    std::cout << "    * Passed!" << std::endl;
}

void testTopologicalSortDAG() {
    std::cout << "  - Running testTopologicalSortDAG..." << std::endl;
    auto g = std::make_shared<Graph>();

    auto n1 = std::make_shared<Node>("N1", "Node 1", NodeType::HALL, 100);
    auto n2 = std::make_shared<Node>("N2", "Node 2", NodeType::HALL, 100);
    auto n3 = std::make_shared<Node>("N3", "Node 3", NodeType::HALL, 100);

    g->addNode(n1);
    g->addNode(n2);
    g->addNode(n3);

    // N1 -> N2 -> N3
    g->addEdge(std::make_shared<Edge>("E1", n1, n2, 10, 10));
    g->addEdge(std::make_shared<Edge>("E2", n2, n3, 10, 10));

    bool hasCycle = false;
    auto order = runTopologicalSort(g, hasCycle);

    assert(!hasCycle);
    assert(order.size() == 3);
    assert(order[0] == "N1");
    assert(order[1] == "N2");
    assert(order[2] == "N3");

    std::cout << "    * Passed!" << std::endl;
}

void testTopologicalSortCycle() {
    std::cout << "  - Running testTopologicalSortCycle..." << std::endl;
    auto g = std::make_shared<Graph>();

    auto n1 = std::make_shared<Node>("N1", "Node 1", NodeType::HALL, 100);
    auto n2 = std::make_shared<Node>("N2", "Node 2", NodeType::HALL, 100);
    auto n3 = std::make_shared<Node>("N3", "Node 3", NodeType::HALL, 100);

    g->addNode(n1);
    g->addNode(n2);
    g->addNode(n3);

    // N1 -> N2 -> N3 -> N1 (Cycle!)
    g->addEdge(std::make_shared<Edge>("E1", n1, n2, 10, 10));
    g->addEdge(std::make_shared<Edge>("E2", n2, n3, 10, 10));
    g->addEdge(std::make_shared<Edge>("E3", n3, n1, 10, 10));

    bool hasCycle = false;
    auto order = runTopologicalSort(g, hasCycle);

    assert(hasCycle);
    std::cout << "    * Passed!" << std::endl;
}

int main() {
    std::cout << "\033[1;35m";
    std::cout << "====================================================\n";
    std::cout << "    EvacuGraph: Running Evacuation Algorithm Tests  \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";

    testMultiSourceBFS();
    testTopologicalSortDAG();
    testTopologicalSortCycle();

    std::cout << "\033[1;32m";
    std::cout << "\n====================================================\n";
    std::cout << "       ALL TESTS COMPLETED SUCCESSFULLY!            \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";
    return 0;
}
