#include <iostream>
#include <memory>
#include <unordered_map>
#include <vector>
#include <string>
#include <algorithm>
#include <iomanip>
#include <limits>
#include "data_structures/Node.h"
#include "data_structures/Edge.h"
#include "data_structures/Graph.h"
#include "simulation/CrowdSimulator.h"
#include "simulation/EvacuationManager.h"
#include "visualization/HeatmapGenerator.h"
#include "algorithms/astar.h"
#include "algorithms/evacuation.h"
#include "algorithms/maxflow.h"
#include "data_structures/SegmentTree.h"

using namespace EvacuGraph;

// Safe integer input helper
int getMenuChoice() {
    int choice;
    while (true) {
        std::cout << "Enter choice (1-6): ";
        if (std::cin >> choice) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return choice;
        } else {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            std::cout << "\033[31mInvalid input. Please enter a valid number (1-6).\033[0m\n";
        }
    }
}

// Safe string input helper
std::string getRequiredString(const std::string& prompt) {
    std::string value;
    while (true) {
        std::cout << prompt;
        if (std::getline(std::cin, value)) {
            // Remove leading/trailing whitespaces
            value.erase(0, value.find_first_not_of(" \t\r\n"));
            value.erase(value.find_last_not_of(" \t\r\n") + 1);
            if (!value.empty()) return value;
        }
        std::cout << "\033[31mInput cannot be empty. Please try again.\033[0m\n";
    }
}

int main() {
    // 1. Create and construct the default venue layout graph
    auto venueGraph = std::make_shared<Graph>();

    // Add Nodes (Entry gates, halls, corridors, exits)
    auto gateA = std::make_shared<Node>("Gate_A", "Gate A Entrance", NodeType::ENTRY_GATE, 500.0, 10.0, 100.0);
    auto gateB = std::make_shared<Node>("Gate_B", "Gate B Entrance", NodeType::ENTRY_GATE, 500.0, 10.0, 10.0);
    auto hall1 = std::make_shared<Node>("Hall_1", "Main Hall 1", NodeType::HALL, 1000.0, 50.0, 80.0);
    auto hall2 = std::make_shared<Node>("Hall_2", "Dining Hall 2", NodeType::HALL, 600.0, 50.0, 30.0);
    auto corridor1 = std::make_shared<Node>("Corridor_1", "Central Corridor 1", NodeType::CORRIDOR, 300.0, 150.0, 50.0);
    auto exitA = std::make_shared<Node>("Exit_A", "Emergency Exit A", NodeType::EMERGENCY_EXIT, 800.0, 200.0, 80.0);
    auto exitB = std::make_shared<Node>("Exit_B", "Emergency Exit B", NodeType::EMERGENCY_EXIT, 800.0, 200.0, 20.0);

    venueGraph->addNode(gateA);
    venueGraph->addNode(gateB);
    venueGraph->addNode(hall1);
    venueGraph->addNode(hall2);
    venueGraph->addNode(corridor1);
    venueGraph->addNode(exitA);
    venueGraph->addNode(exitB);

    // Add Edges representing pathways between locations
    venueGraph->addEdge(std::make_shared<Edge>("E_GA_H1", gateA, hall1, 250.0, 45.0));
    venueGraph->addEdge(std::make_shared<Edge>("E_GB_H2", gateB, hall2, 250.0, 45.0));
    venueGraph->addEdge(std::make_shared<Edge>("E_H1_C1", hall1, corridor1, 500.0, 60.0));
    venueGraph->addEdge(std::make_shared<Edge>("E_H2_C1", hall2, corridor1, 450.0, 60.0));
    venueGraph->addEdge(std::make_shared<Edge>("E_C1_EA", corridor1, exitA, 250.0, 30.0));
    venueGraph->addEdge(std::make_shared<Edge>("E_C1_EB", corridor1, exitB, 250.0, 30.0));

    // Default Initial Densities
    std::unordered_map<std::string, double> initialDensities = {
        {"Gate_A",     120.0},
        {"Gate_B",      40.0},
        {"Hall_1",     950.0}, // Near capacity (95%)
        {"Hall_2",     380.0}, 
        {"Corridor_1",  20.0},
        {"Exit_A",       0.0},
        {"Exit_B",       0.0}
    };

    std::vector<std::string> simExits = {"Exit_A", "Exit_B"};
    auto simulator = std::make_shared<CrowdSimulator>(venueGraph, simExits, 42);
    simulator->initializeCrowdDistribution(initialDensities);

    auto heatmap = std::make_shared<HeatmapGenerator>(venueGraph);

    // Main CLI Loop
    while (true) {
        std::cout << "\033[1;36m";
        std::cout << "=================================================================\n";
        std::cout << "         EvacuGraph: DAA Crowd Management & Evacuation          \n";
        std::cout << "=================================================================\n";
        std::cout << "\033[0m";
        std::cout << "  1. View Graph\n";
        std::cout << "  2. Run Simulation (Integrated Flow)\n";
        std::cout << "  3. Find Route (A* Search)\n";
        std::cout << "  4. Evacuation Plan (BFS, Topological Sort & Max Flow)\n";
        std::cout << "  5. Heatmap\n";
        std::cout << "  6. Exit\n";
        std::cout << "-----------------------------------------------------------------\n";

        int choice = getMenuChoice();

        if (choice == 1) {
            std::cout << "\n--- Venue Layout Graph Structures ---" << std::endl;
            venueGraph->printGraph();
            std::cout << "-----------------------------------------------------------------\n" << std::endl;
        } 
        else if (choice == 2) {
            std::cout << "\nEnter number of simulation cycles to run [default: 5]: ";
            std::string iterInput;
            std::getline(std::cin, iterInput);
            int numIters = 5;
            if (!iterInput.empty()) {
                try {
                    numIters = std::stoi(iterInput);
                } catch (...) {
                    std::cout << "\033[31mInvalid input. Running default 5 cycles.\033[0m\n";
                    numIters = 5;
                }
            }

            std::cout << "\n\033[1;33m>>> Starting Integrated Simulation Flow (" << numIters << " Cycles) <<<\033[0m\n";

            for (int i = 0; i < numIters; ++i) {
                std::cout << "\n\033[1;35m=============================================================\033[0m" << std::endl;
                std::cout << "\033[1;35m  CYCLE " << (i + 1) << " / " << numIters << "\033[0m" << std::endl;
                std::cout << "\033[1;35m=============================================================\033[0m" << std::endl;

                // Flow 1: Build/Maintain venue graph (implied by venueGraph memory pointer)
                std::cout << "\033[1m[1. Graph Layout]\033[0m Maintained active venue topology." << std::endl;

                // Flow 2: Generate crowd
                std::cout << "\033[1m[2. Generate Crowd]\033[0m Injecting random arrivals at entrance gates..." << std::endl;
                // We simulate random crowd arrivals at entrance gates
                for (const auto& [nodeId, node] : venueGraph->getAllNodes()) {
                    if (node->getType() == NodeType::ENTRY_GATE) {
                        double maxInject = node->getCapacity() * 0.15;
                        double inject = (static_cast<double>(std::rand()) / RAND_MAX) * maxInject;
                        node->setCurrentDensity(std::min(node->getCurrentDensity() + inject, node->getCapacity()));
                        std::cout << "  * Injected " << std::fixed << std::setprecision(1) << inject 
                                  << " people at " << nodeId << " (Density: " << node->getCurrentDensity() << ")" << std::endl;
                    }
                }

                // Flow 3: Run simulation step (Propagate crowd)
                std::cout << "\033[1m[3. Run Simulation Cycle]\033[0m Advancing crowd flow propagation..." << std::endl;
                IterationLog log = simulator->stepSimulation(/*timeStep=*/1.0);

                // Flow 4 & 5: Detect congestion and Compute A* routes
                std::cout << "\033[1m[4. Detect Congestion & 5. Compute A* Routes]\033[0m Checking for warning signs..." << std::endl;
                bool congestionFound = false;
                for (const auto& snap : log.snapshots) {
                    if (snap.riskLevel == RiskLevel::HIGH || snap.riskLevel == RiskLevel::CRITICAL) {
                        congestionFound = true;
                        std::string lvlStr = (snap.riskLevel == RiskLevel::HIGH) ? "\033[38;5;208mHIGH\033[0m" : "\033[31mCRITICAL\033[0m";
                        std::cout << "  * \033[31m[ALERT]\033[0m Congested zone detected: " << snap.nodeId 
                                  << " (" << std::fixed << std::setprecision(1) << snap.density << "/" << snap.capacity 
                                  << " | Level: " << lvlStr << ")" << std::endl;
                        
                        if (snap.reroutingTriggered) {
                            std::cout << "    -> Re-routing path calculated (A*): " << snap.reroutePath << std::endl;
                        }
                    }
                }
                if (!congestionFound) {
                    std::cout << "  * No high or critical congestion detected in this cycle." << std::endl;
                }

                // Flow 6: Compute max flow
                std::cout << "\033[1m[6. Compute Max Flow]\033[0m Checking max crowd throughput capacity..." << std::endl;
                std::vector<std::string> entryGates = {"Gate_A", "Gate_B"};
                MaxFlowResult flowRes = computeMaxFlow(venueGraph, entryGates, simExits);
                std::cout << "  * Max evac throughput capacity: " << std::fixed << std::setprecision(1) 
                          << flowRes.maxFlow << " people/time-unit" << std::endl;

                // Flow 7: Generate evacuation plan
                std::cout << "\033[1m[7. Generate Evacuation Plan]\033[0m Refreshing routing schedule..." << std::endl;
                auto bfsRes = runMultiSourceBFS(venueGraph, simExits);
                bool hasCycle = false;
                auto topoSequence = runTopologicalSort(venueGraph, hasCycle);
                std::cout << "  * Nearest exit steps (hops): ";
                for (const auto& [nodeId, entry] : bfsRes) {
                    std::cout << nodeId << "(" << entry.distance << "h) ";
                }
                std::cout << std::endl;
                if (!hasCycle && !topoSequence.empty()) {
                    std::cout << "  * Evacuation priority sequence: ";
                    for (size_t k = 0; k < topoSequence.size(); ++k) {
                        std::cout << topoSequence[k] << (k + 1 < topoSequence.size() ? " -> " : "");
                    }
                    std::cout << std::endl;
                }

                // Flow 8: Display heatmap
                std::cout << "\033[1m[8. Display Heatmap]\033[0m Rendering current density map..." << std::endl;
                heatmap->generateHeatmap();

                // Interactive stepping
                if (i + 1 < numIters) {
                    std::cout << "\033[90mPress Enter to proceed to the next cycle (or enter 'q' to stop simulation)...\033[0m";
                    std::string line;
                    std::getline(std::cin, line);
                    if (line == "q" || line == "Q") {
                        std::cout << "Simulation stopped early.\n";
                        break;
                    }
                }
            }
            std::cout << "\n\033[1;32m>>> Simulation Integration Run Finished <<<\033[0m\n\n";
        } 
        else if (choice == 3) {
            std::cout << "\n--- Find Safest Congestion-Aware Route (A*) ---" << std::endl;
            std::string start = getRequiredString("Enter source node ID (e.g. Gate_A): ");
            std::string dest = getRequiredString("Enter destination node ID (e.g. Exit_A): ");
            
            auto startNode = venueGraph->getNode(start);
            auto destNode = venueGraph->getNode(dest);
            
            if (!startNode || !destNode) {
                std::cout << "\033[31mError: Source or Destination node not found in graph.\033[0m\n\n";
            } else {
                AStarResult astarResult = findSafestPathAStar(venueGraph, start, dest);
                if (astarResult.path.empty()) {
                    std::cout << "\033[31mNo path found between " << start << " and " << dest << ".\033[0m\n\n";
                } else {
                    std::cout << "\n\033[1;32mSafest Path Located:\033[0m\n";
                    std::cout << "  * Route: ";
                    for (size_t i = 0; i < astarResult.path.size(); ++i) {
                        std::cout << astarResult.path[i]->getId() 
                                  << " (" << astarResult.path[i]->getName() << ")"
                                  << (i + 1 < astarResult.path.size() ? " -> " : "");
                    }
                    std::cout << "\n  * Cumulative Cost (Distance + Density Penalty): " << astarResult.totalCost << std::endl;
                    std::cout << "  * Visited Node Order: ";
                    for (size_t i = 0; i < astarResult.visitedNodes.size(); ++i) {
                        std::cout << astarResult.visitedNodes[i] 
                                  << (i + 1 < astarResult.visitedNodes.size() ? ", " : "");
                    }
                    std::cout << "\n\n";
                }
            }
        } 
        else if (choice == 4) {
            std::cout << "\n--- System-Wide Evacuation Plan & Bottleneck Analysis ---" << std::endl;
            
            // Multi-source BFS
            auto bfsResults = runMultiSourceBFS(venueGraph, simExits);
            std::cout << "\n\033[1m1. Hop Distance to Nearest Exit (Multi-Source BFS):\033[0m" << std::endl;
            for (const auto& [nodeId, entry] : bfsResults) {
                std::cout << "  * Node: " << std::left << std::setw(12) << nodeId 
                          << " | Closest Exit: " << std::left << std::setw(10) << entry.nearestExitId 
                          << " | Distance: " << entry.distance << " hops" << std::endl;
            }

            // Topological Sort
            bool hasCycle = false;
            auto topoOrder = runTopologicalSort(venueGraph, hasCycle);
            std::cout << "\n\033[1m2. Evacuation Priority Order (Topological Sort Kahn's):\033[0m" << std::endl;
            if (hasCycle) {
                std::cout << "  \033[31m[Warning] Cycle detected in venue layout! Standard Topological Sort priority is not possible.\033[0m" << std::endl;
            } else {
                std::cout << "  * Order: ";
                for (size_t i = 0; i < topoOrder.size(); ++i) {
                    std::cout << topoOrder[i] << (i + 1 < topoOrder.size() ? " -> " : "");
                }
                std::cout << std::endl;
            }

            // Edmonds-Karp Max Flow
            std::vector<std::string> entryGates = {"Gate_A", "Gate_B"};
            MaxFlowResult flowResult = computeMaxFlow(venueGraph, entryGates, simExits);
            std::cout << "\n\033[1m3. Maximum Evacuation Flow Capacity:\033[0m " 
                      << flowResult.maxFlow << " people/time-unit" << std::endl;

            std::cout << "\n\033[1mCorridor Flow Utilization Report:\033[0m" << std::endl;
            std::cout << "  ----------------------------------------------------------------------" << std::endl;
            std::cout << "  " << std::left << std::setw(12) << "Corridor" 
                      << "| " << std::setw(30) << "Route" 
                      << "| " << std::setw(15) << "Flow / Capacity" 
                      << "| Utilization" << std::endl;
            std::cout << "  ----------------------------------------------------------------------" << std::endl;
            for (const auto& edgeFlow : flowResult.edgeFlows) {
                std::cout << "  " << std::left << std::setw(12) << edgeFlow.edgeId 
                          << "| " << std::left << std::setw(30) << (edgeFlow.sourceName + " -> " + edgeFlow.destName) 
                          << "| " << std::right << std::setw(6) << edgeFlow.flow << " / " << std::left << std::setw(7) << edgeFlow.capacity 
                          << "| " << std::right << std::fixed << std::setprecision(1) << edgeFlow.utilization << "%" << std::endl;
            }
            std::cout << "  ----------------------------------------------------------------------" << std::endl;

            std::cout << "\n\033[1mSaturated Bottleneck Corridors:\033[0m" << std::endl;
            if (flowResult.bottlenecks.empty()) {
                std::cout << "  \033[32mNo saturated corridors detected (flow is safe and well-distributed).\033[0m" << std::endl;
            } else {
                for (const auto& bottleneck : flowResult.bottlenecks) {
                    std::cout << "  * \033[31m[BOTTLENECK]\033[0m Corridor \"" << bottleneck.edgeId << "\" (" 
                              << bottleneck.sourceName << " -> " << bottleneck.destName 
                              << ") is fully saturated at " << bottleneck.utilization << "% capacity." << std::endl;
                }
            }
            std::cout << std::endl;
        } 
        else if (choice == 5) {
            heatmap->generateHeatmap();
        } 
        else if (choice == 6) {
            std::cout << "\nExiting EvacuGraph. Stay safe!\n";
            break;
        } 
        else {
            std::cout << "\033[31mInvalid option. Please select 1-6.\033[0m\n\n";
        }
    }

    return 0;
}
