#pragma once

#include <memory>
#include "data_structures/Graph.h"

namespace EvacuGraph {

/**
 * @brief Class that processes graph data to generate visual/console heatmaps of crowd densities.
 */
class HeatmapGenerator {
public:
    /**
     * @brief Construct a new Heatmap Generator.
     * @param graph Shared pointer to the venue graph.
     */
    HeatmapGenerator(std::shared_ptr<Graph> graph);

    /**
     * @brief Output the density heat map to the standard console.
     */
    void generateHeatmap() const;

    /**
     * @brief Helper to classify density levels (e.g. LOW, MODERATE, HIGH, DANGER).
     * @param density Current crowd count.
     * @param capacity Maximum capacity.
     * @return std::string A console-friendly representation or category name.
     */
    std::string getDensityColor(double density, double capacity) const;

private:
    std::shared_ptr<Graph> graph_;
};

} // namespace EvacuGraph
