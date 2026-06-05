#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <functional>
#include "data_structures/Graph.h"
#include "data_structures/SegmentTree.h"

namespace EvacuGraph {

// ─── Risk Level Classification ───────────────────────────────────────────────

/**
 * @brief Four-tier crowd risk classification for each node.
 *
 * Thresholds (percentage of capacity):
 *   SAFE     <  50%
 *   MODERATE >= 50% and < 70%
 *   HIGH     >= 70% and < 90%
 *   CRITICAL >= 90%
 */
enum class RiskLevel {
    SAFE,
    MODERATE,
    HIGH,
    CRITICAL
};

/** Convert a RiskLevel to a coloured string label for console output. */
std::string riskLevelToString(RiskLevel level);

/** Return the ANSI escape prefix for a RiskLevel colour. */
std::string riskLevelColor(RiskLevel level);

// ─── Per-node simulation snapshot ────────────────────────────────────────────

/**
 * @brief Snapshot of one node's state captured at the end of each iteration.
 */
struct NodeSimSnapshot {
    std::string nodeId;
    std::string nodeName;
    double density;         // Absolute crowd count
    double capacity;        // Maximum capacity
    double utilization;     // density / capacity * 100
    RiskLevel riskLevel;
    bool reroutingTriggered; // true if A* was invoked for this node this iteration
    std::string reroutePath; // Human-readable path string if rerouting occurred
};

/**
 * @brief Full log record for a single simulation iteration.
 */
struct IterationLog {
    int iteration;
    std::vector<NodeSimSnapshot> snapshots;
    std::vector<std::string> events;  // Free-text alerts and routing messages
};

// ─── CrowdSimulator ──────────────────────────────────────────────────────────

/**
 * @brief Enhanced CrowdSimulator with:
 *   - Random crowd injection at entry gates
 *   - Per-iteration density propagation along edges
 *   - Four-level risk classification (SAFE / MODERATE / HIGH / CRITICAL)
 *   - Automatic A* rerouting when a node exceeds the HIGH threshold
 *   - Segment Tree for O(log n) range density queries
 *   - Structured iteration-level logging
 */
class CrowdSimulator {
public:
    /**
     * @brief Construct a CrowdSimulator.
     * @param graph Shared pointer to the venue graph.
     * @param exitIds IDs of emergency-exit nodes used as A* targets.
     * @param randomSeed Seed for random crowd generation (default: 42).
     */
    CrowdSimulator(std::shared_ptr<Graph> graph,
                   const std::vector<std::string>& exitIds = {},
                   unsigned int randomSeed = 42);

    /**
     * @brief Seed the venue with an explicit initial density map.
     * @param initialDensities Map of nodeId -> starting crowd count.
     */
    void initializeCrowdDistribution(
        const std::unordered_map<std::string, double>& initialDensities);

    /**
     * @brief Advance the simulation by one time step and return the log.
     * @param timeStep Fraction of capacity to flow per step (0 < timeStep <= 1).
     * Complexity: O(E log n) — O(E) edge traversals + O(log n) segment-tree updates.
     */
    IterationLog stepSimulation(double timeStep);

    /**
     * @brief Run the full simulation for `numIterations` steps, printing
     *        structured logs to stdout after each step.
     * @param numIterations Number of steps to run.
     * @param timeStep      Flow fraction per step.
     * @param injectCrowd   If true, randomly inject new crowd each iteration.
     */
    void runSimulation(int numIterations, double timeStep, bool injectCrowd = true);

    /** Directly set a node's crowd count. */
    void updateNodeDensity(const std::string& nodeId, double density);

    /** Directly set an edge's current flow value. */
    void updateEdgeFlow(const std::string& edgeId, double flow);

    /** Return all captured iteration logs. */
    const std::vector<IterationLog>& getLogs() const;

    /** Return the segment tree used internally for range queries. */
    std::shared_ptr<SegmentTree> getSegmentTree() const;

private:
    std::shared_ptr<Graph>       graph_;
    std::vector<std::string>     exitIds_;       // Registered exit node IDs
    unsigned int                 randomSeed_;
    int                          iterationCount_ = 0;
    std::vector<IterationLog>    logs_;

    // Ordered index list for SegmentTree (stable across iterations)
    std::vector<std::string>     segNodeIds_;
    std::shared_ptr<SegmentTree> segTree_;

    /** Classify a utilization percentage into a risk level. */
    RiskLevel classifyRisk(double utilization) const;

    /** Inject random new arrivals at ENTRY_GATE nodes. */
    void injectRandomCrowd();

    /** Propagate crowd from high-density nodes along outgoing edges. */
    void propagateCrowd(double timeStep, IterationLog& log);

    /** Run A* from `nodeId` to the nearest registered exit and log the route. */
    void triggerRerouting(const std::string& nodeId, NodeSimSnapshot& snap,
                          IterationLog& log);

    /** Rebuild the segment tree from current graph densities. */
    void syncSegmentTree();
};

} // namespace EvacuGraph
