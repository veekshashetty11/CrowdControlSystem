#include "visualization/HeatmapGenerator.h"
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <cmath>

namespace EvacuGraph {

HeatmapGenerator::HeatmapGenerator(std::shared_ptr<Graph> graph) : graph_(graph) {}

void HeatmapGenerator::generateHeatmap() const {
    if (!graph_) return;
    std::cout << "\n\033[1;36m=================== CROWD DENSITY HEATMAP ===================\033[0m" << std::endl;
    
    // Sort nodes by ID for deterministic output
    std::vector<std::shared_ptr<Node>> sortedNodes;
    for (const auto& [nodeId, node] : graph_->getAllNodes()) {
        sortedNodes.push_back(node);
    }
    std::sort(sortedNodes.begin(), sortedNodes.end(), [](const auto& a, const auto& b) {
        return a->getId() < b->getId();
    });

    for (const auto& node : sortedNodes) {
        double density = node->getCurrentDensity();
        double capacity = node->getCapacity();
        std::string color = getDensityColor(density, capacity);
        
        // Calculate 8-character progress bar representation
        int barWidth = 8;
        double ratio = (capacity > 0.0) ? (density / capacity) : 0.0;
        int filled = static_cast<int>(std::round(ratio * barWidth));
        filled = std::max(0, std::min(barWidth, filled));
        
        std::string bar = "[";
        for (int i = 0; i < barWidth; ++i) {
            if (i < filled) bar += "#";
            else bar += "-";
        }
        bar += "]";

        // Determine utilization percentage for additional context
        double utilPercent = ratio * 100.0;

        std::cout << std::left << std::setw(12) << node->getId() 
                  << color << bar << "\033[0m"
                  << " (" << std::fixed << std::setprecision(1) << density << "/" << capacity 
                  << " | " << std::setw(5) << std::right << std::setprecision(1) << utilPercent << "%)"
                  << std::endl;
    }
    std::cout << "\n\033[1mLegend:\033[0m" << std::endl;
    std::cout << "\033[32m  Green  = Safe (< 50%)\033[0m" << std::endl;
    std::cout << "\033[33m  Yellow = Moderate (50% - 70%)\033[0m" << std::endl;
    std::cout << "\033[38;5;208m  Orange = High (70% - 90%)\033[0m" << std::endl;
    std::cout << "\033[31m  Red    = Critical (>= 90%)\033[0m" << std::endl;
    std::cout << "\033[1;36m=============================================================\033[0m\n" << std::endl;
}

std::string HeatmapGenerator::getDensityColor(double density, double capacity) const {
    if (capacity <= 0.0) return "\033[37m"; // White/Default
    
    double ratio = density / capacity;
    if (ratio < 0.50) {
        return "\033[32m"; // Green
    } else if (ratio < 0.70) {
        return "\033[33m"; // Yellow
    } else if (ratio < 0.90) {
        return "\033[38;5;208m"; // Orange
    } else {
        return "\033[31m"; // Red
    }
}

} // namespace EvacuGraph
