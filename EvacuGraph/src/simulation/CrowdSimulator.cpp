#include "simulation/CrowdSimulator.h"
#include "algorithms/astar.h"
#include <iostream>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <cstdlib>
#include <cmath>

namespace EvacuGraph {

// ─── Risk Level Helpers ───────────────────────────────────────────────────────

std::string riskLevelToString(RiskLevel level) {
    switch (level) {
        case RiskLevel::SAFE:     return "SAFE";
        case RiskLevel::MODERATE: return "MODERATE";
        case RiskLevel::HIGH:     return "HIGH";
        case RiskLevel::CRITICAL: return "CRITICAL";
    }
    return "UNKNOWN";
}

std::string riskLevelColor(RiskLevel level) {
    switch (level) {
        case RiskLevel::SAFE:     return "\033[1;32m"; // Green
        case RiskLevel::MODERATE: return "\033[1;33m"; // Yellow
        case RiskLevel::HIGH:     return "\033[1;35m"; // Magenta
        case RiskLevel::CRITICAL: return "\033[1;31m"; // Red
    }
    return "\033[0m";
}

// ─── Constructor ─────────────────────────────────────────────────────────────

CrowdSimulator::CrowdSimulator(std::shared_ptr<Graph> graph,
                               const std::vector<std::string>& exitIds,
                               unsigned int randomSeed)
    : graph_(graph), exitIds_(exitIds), randomSeed_(randomSeed)
{
    std::srand(randomSeed_);

    // Build stable ordered node list for SegmentTree (sorted for determinism)
    if (graph_) {
        for (const auto& [nodeId, node] : graph_->getAllNodes()) {
            segNodeIds_.push_back(nodeId);
        }
        std::sort(segNodeIds_.begin(), segNodeIds_.end());
        syncSegmentTree();
    }
}

// ─── initializeCrowdDistribution ─────────────────────────────────────────────

void CrowdSimulator::initializeCrowdDistribution(
    const std::unordered_map<std::string, double>& initialDensities)
{
    if (!graph_) return;
    for (const auto& [nodeId, density] : initialDensities) {
        auto node = graph_->getNode(nodeId);
        if (node) node->setCurrentDensity(density);
    }
    syncSegmentTree();
}

// ─── classifyRisk ────────────────────────────────────────────────────────────

RiskLevel CrowdSimulator::classifyRisk(double utilization) const {
    if (utilization >= 90.0) return RiskLevel::CRITICAL;
    if (utilization >= 70.0) return RiskLevel::HIGH;
    if (utilization >= 50.0) return RiskLevel::MODERATE;
    return RiskLevel::SAFE;
}

// ─── injectRandomCrowd ───────────────────────────────────────────────────────

/**
 * Injects a random number of new arrivals (0 – 15% of capacity) into every
 * ENTRY_GATE node, simulating fresh crowd entering the venue each iteration.
 */
void CrowdSimulator::injectRandomCrowd() {
    if (!graph_) return;
    for (const auto& [nodeId, node] : graph_->getAllNodes()) {
        if (node->getType() != NodeType::ENTRY_GATE) continue;

        // Random injection: 0 – 15% of gate capacity
        double maxInject = node->getCapacity() * 0.15;
        double inject    = (static_cast<double>(std::rand()) / RAND_MAX) * maxInject;

        double newDensity = std::min(node->getCurrentDensity() + inject,
                                     node->getCapacity());
        node->setCurrentDensity(newDensity);
    }
}

// ─── propagateCrowd ──────────────────────────────────────────────────────────

/**
 * Moves a fraction of each node's crowd along outgoing edges.
 * Flow amount per edge = timeStep * 10% of source density,
 * clamped by edge capacity and destination remaining capacity.
 */
void CrowdSimulator::propagateCrowd(double timeStep, IterationLog& /*log*/) {
    if (!graph_) return;
    for (const auto& [nodeId, edges] : graph_->getAdjacencyList()) {
        auto srcNode = graph_->getNode(nodeId);
        if (!srcNode || srcNode->getCurrentDensity() <= 0.0) continue;
        if (srcNode->getType() == NodeType::EMERGENCY_EXIT) continue;

        for (const auto& edge : edges) {
            auto destNode = edge->getDestination();
            if (!destNode) continue;

            double flowAmount = srcNode->getCurrentDensity() * 0.10 * timeStep;
            flowAmount = std::min(flowAmount, edge->getCapacity());

            double remainingCap = destNode->getCapacity() - destNode->getCurrentDensity();
            flowAmount = std::min(flowAmount, remainingCap);

            if (flowAmount > 0.0) {
                srcNode->setCurrentDensity(srcNode->getCurrentDensity() - flowAmount);
                destNode->setCurrentDensity(destNode->getCurrentDensity() + flowAmount);
                edge->setCurrentFlow(flowAmount);
                edge->updateDynamicWeight();
            }
        }
    }
}

// ─── triggerRerouting ────────────────────────────────────────────────────────

/**
 * Runs A* from the congested node toward each registered exit, picks the
 * cheapest one, and records the route in the snapshot and log.
 */
void CrowdSimulator::triggerRerouting(const std::string& nodeId,
                                      NodeSimSnapshot& snap,
                                      IterationLog& log) {
    if (exitIds_.empty()) return;

    double    bestCost  = std::numeric_limits<double>::infinity();
    AStarResult bestResult;

    for (const auto& exitId : exitIds_) {
        AStarResult r = findSafestPathAStar(graph_, nodeId, exitId);
        if (!r.path.empty() && r.totalCost < bestCost) {
            bestCost   = r.totalCost;
            bestResult = r;
        }
    }

    if (bestResult.path.empty()) return;

    // Build human-readable path string
    std::ostringstream oss;
    for (size_t i = 0; i < bestResult.path.size(); ++i) {
        oss << bestResult.path[i]->getId();
        if (i + 1 < bestResult.path.size()) oss << " -> ";
    }
    snap.reroutingTriggered = true;
    snap.reroutePath        = oss.str();

    std::ostringstream evt;
    evt << "  \033[1;36m[REROUTE]\033[0m " << nodeId
        << " -> Safest path: " << snap.reroutePath
        << "  (cost=" << std::fixed << std::setprecision(1) << bestCost << ")";
    log.events.push_back(evt.str());
}

// ─── syncSegmentTree ─────────────────────────────────────────────────────────

void CrowdSimulator::syncSegmentTree() {
    if (!graph_ || segNodeIds_.empty()) return;
    std::vector<double> densities;
    for (const auto& id : segNodeIds_) {
        auto node = graph_->getNode(id);
        densities.push_back(node ? node->getCurrentDensity() : 0.0);
    }
    segTree_ = std::make_shared<SegmentTree>(segNodeIds_, densities);
}

// ─── stepSimulation ──────────────────────────────────────────────────────────

IterationLog CrowdSimulator::stepSimulation(double timeStep) {
    ++iterationCount_;
    IterationLog log;
    log.iteration = iterationCount_;

    // 1. Propagate crowd along edges
    propagateCrowd(timeStep, log);

    // 2. Refresh segment tree
    syncSegmentTree();

    // 3. Snapshot every node; classify risk; trigger A* rerouting if needed
    for (const auto& nodeId : segNodeIds_) {
        auto node = graph_->getNode(nodeId);
        if (!node) continue;

        double util  = (node->getCapacity() > 0.0)
                     ? (node->getCurrentDensity() / node->getCapacity() * 100.0)
                     : 0.0;
        RiskLevel risk = classifyRisk(util);

        NodeSimSnapshot snap;
        snap.nodeId           = nodeId;
        snap.nodeName         = node->getName();
        snap.density          = node->getCurrentDensity();
        snap.capacity         = node->getCapacity();
        snap.utilization      = util;
        snap.riskLevel        = risk;
        snap.reroutingTriggered = false;

        // Emit risk alerts for HIGH and CRITICAL
        if (risk == RiskLevel::HIGH || risk == RiskLevel::CRITICAL) {
            std::ostringstream evt;
            evt << "  " << riskLevelColor(risk) << "[" << riskLevelToString(risk)
                << " ALERT]\033[0m " << nodeId
                << "  density=" << std::fixed << std::setprecision(1)
                << snap.density << "/" << snap.capacity
                << "  (" << std::setprecision(1) << util << "%)";
            log.events.push_back(evt.str());
        }

        // Auto-reroute when >= HIGH (70%)
        if (risk == RiskLevel::HIGH || risk == RiskLevel::CRITICAL) {
            triggerRerouting(nodeId, snap, log);
        }

        log.snapshots.push_back(snap);
    }

    logs_.push_back(log);
    return log;
}

// ─── runSimulation ───────────────────────────────────────────────────────────

void CrowdSimulator::runSimulation(int numIterations, double timeStep,
                                   bool injectCrowd) {
    const std::string RESET  = "\033[0m";
    const std::string BOLD   = "\033[1m";
    const std::string CYAN   = "\033[1;36m";
    const std::string YELLOW = "\033[1;33m";

    std::cout << CYAN
              << "\n╔══════════════════════════════════════════════════════════╗\n"
              << "║          EvacuGraph — Live Crowd Simulation              ║\n"
              << "╚══════════════════════════════════════════════════════════╝\n"
              << RESET;

    for (int i = 0; i < numIterations; ++i) {
        // Inject new arrivals before stepping
        if (injectCrowd) injectRandomCrowd();

        IterationLog log = stepSimulation(timeStep);

        // ── Iteration header ──────────────────────────────────────────────
        std::cout << BOLD << YELLOW
                  << "\n──── Iteration " << log.iteration
                  << " ─────────────────────────────────────────────\n"
                  << RESET;

        // ── Per-node status table ─────────────────────────────────────────
        std::cout << "  Node            | Density / Cap   | Util%  | Risk\n"
                  << "  ----------------|-----------------|--------|----------\n";

        for (const auto& snap : log.snapshots) {
            // Build utilization bar (15 chars wide)
            int barFilled = static_cast<int>(snap.utilization / 100.0 * 15);
            barFilled = std::max(0, std::min(15, barFilled));
            std::string bar(barFilled, '#');
            bar += std::string(15 - barFilled, '.');

            std::string riskColor = riskLevelColor(snap.riskLevel);
            std::cout << "  "
                      << std::left  << std::setw(16) << snap.nodeId << "| "
                      << std::right << std::setw(6)  << std::fixed << std::setprecision(1)
                      << snap.density << " / "
                      << std::setw(6) << snap.capacity << "  | "
                      << std::setw(5) << std::setprecision(1) << snap.utilization << "% | "
                      << riskColor << std::left << std::setw(10)
                      << riskLevelToString(snap.riskLevel) << RESET;

            if (snap.reroutingTriggered) {
                std::cout << " \033[1;36m[REROUTING ACTIVE]\033[0m";
            }
            std::cout << "\n";
        }

        // ── Events (alerts and rerouting) ─────────────────────────────────
        if (!log.events.empty()) {
            std::cout << "\n  Events:\n";
            for (const auto& evt : log.events) {
                std::cout << evt << "\n";
            }
        }

        // ── Segment tree aggregate summary for this iteration ─────────────
        if (segTree_) {
            double maxD = segTree_->queryMaxDensity(0, segTree_->size() - 1);
            double sumD = segTree_->querySumDensity(0, segTree_->size() - 1);
            int    peak = segTree_->queryPeakIndex();
            std::cout << "\n  \033[90m[SegTree] Max=" << std::setprecision(1) << maxD
                      << "  Total=" << sumD
                      << "  Peak=" << segTree_->getNodeId(peak) << "\033[0m\n";
        }
    }

    std::cout << CYAN
              << "\n╔══════════════════════════════════════════════════════════╗\n"
              << "║               Simulation Complete                        ║\n"
              << "╚══════════════════════════════════════════════════════════╝\n"
              << RESET;
}

// ─── Accessors & Direct Mutators ─────────────────────────────────────────────

void CrowdSimulator::updateNodeDensity(const std::string& nodeId, double density) {
    if (!graph_) return;
    auto node = graph_->getNode(nodeId);
    if (node) { node->setCurrentDensity(density); syncSegmentTree(); }
}

void CrowdSimulator::updateEdgeFlow(const std::string& edgeId, double flow) {
    if (!graph_) return;
    auto edge = graph_->getEdge(edgeId);
    if (edge) edge->setCurrentFlow(flow);
}

const std::vector<IterationLog>& CrowdSimulator::getLogs() const {
    return logs_;
}

std::shared_ptr<SegmentTree> CrowdSimulator::getSegmentTree() const {
    return segTree_;
}

} // namespace EvacuGraph
