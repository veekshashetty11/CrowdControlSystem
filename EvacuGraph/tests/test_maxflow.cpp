#include <iostream>
#include <cassert>
#include <memory>
#include <vector>
#include "data_structures/Node.h"
#include "data_structures/Edge.h"
#include "data_structures/Graph.h"
#include "algorithms/maxflow.h"

using namespace EvacuGraph;

void testMaxFlowSimple() {
    std::cout << "  - Running testMaxFlowSimple..." << std::endl;
    auto g = std::make_shared<Graph>();

    auto gate1 = std::make_shared<Node>("Gate1", "Gate 1", NodeType::ENTRY_GATE, 100);
    auto exit1 = std::make_shared<Node>("Exit1", "Exit 1", NodeType::EMERGENCY_EXIT, 100);
    auto hall1 = std::make_shared<Node>("Hall1", "Hall 1", NodeType::HALL, 100);
    auto hall2 = std::make_shared<Node>("Hall2", "Hall 2", NodeType::HALL, 100);

    g->addNode(gate1);
    g->addNode(exit1);
    g->addNode(hall1);
    g->addNode(hall2);

    // Gate1 -> Hall1 (40)
    // Gate1 -> Hall2 (60)
    g->addEdge(std::make_shared<Edge>("E1", gate1, hall1, 40, 10));
    g->addEdge(std::make_shared<Edge>("E2", gate1, hall2, 60, 10));

    // Hall1 -> Exit1 (30) (Saturated!)
    // Hall2 -> Exit1 (50) (Saturated!)
    g->addEdge(std::make_shared<Edge>("E3", hall1, exit1, 30, 10));
    g->addEdge(std::make_shared<Edge>("E4", hall2, exit1, 50, 10));

    std::vector<std::string> entries = {"Gate1"};
    std::vector<std::string> exits = {"Exit1"};

    MaxFlowResult result = computeMaxFlow(g, entries, exits);

    // Max flow should be 30 + 50 = 80
    assert(result.maxFlow == 80.0);

    // Bottlenecks should contain E3 and E4
    bool foundE3 = false;
    bool foundE4 = false;
    for (const auto& bottleneck : result.bottlenecks) {
        if (bottleneck.edgeId == "E3") {
            foundE3 = true;
            assert(bottleneck.flow == 30.0);
            assert(bottleneck.utilization == 100.0);
        }
        if (bottleneck.edgeId == "E4") {
            foundE4 = true;
            assert(bottleneck.flow == 50.0);
            assert(bottleneck.utilization == 100.0);
        }
    }

    assert(foundE3);
    assert(foundE4);

    std::cout << "    * Passed!" << std::endl;
}

int main() {
    std::cout << "\033[1;35m";
    std::cout << "====================================================\n";
    std::cout << "     EvacuGraph: Running Max Flow Algorithm Tests   \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";

    testMaxFlowSimple();

    std::cout << "\033[1;32m";
    std::cout << "\n====================================================\n";
    std::cout << "       ALL TESTS COMPLETED SUCCESSFULLY!            \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";
    return 0;
}
