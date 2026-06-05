#pragma once

#include <vector>
#include <string>
#include <functional>
#include <stdexcept>
#include <limits>

namespace EvacuGraph {

/**
 * @brief A Segment Tree for storing and querying crowd density values
 *        indexed by numeric position (venue node index).
 *
 * Supports:
 *   - updateDensity(index, value) in O(log n)
 *   - queryDensity(index)         in O(1) — direct lookup in underlying array
 *   - queryMaxDensity(l, r)       in O(log n) — max over a range
 *   - querySumDensity(l, r)       in O(log n) — sum over a range
 *   - queryPeakIndex()            in O(1)     — index of maximum density node
 *
 * Internal representation:
 *   The tree is stored as a 1-indexed flat array of size 4*n.
 *   Each internal node holds:
 *     - maxVal:  maximum density in the subtree range
 *     - sumVal:  sum of densities in the subtree range
 */
class SegmentTree {
public:
    /**
     * @brief Construct a Segment Tree backed by the given node labels.
     * @param nodeIds Ordered list of node ID strings (defines index ↔ name mapping).
     * @param initialDensities Initial density values aligned to nodeIds.
     */
    SegmentTree(const std::vector<std::string>& nodeIds,
                const std::vector<double>& initialDensities);

    /**
     * @brief Point-update: set density of the node at position `index` to `value`.
     * @param index 0-based index into the nodeIds vector.
     * @param value New density value to assign.
     * Complexity: O(log n)
     */
    void updateDensity(int index, double value);

    /**
     * @brief Point-query: return the stored density for node at `index`.
     * @param index 0-based index.
     * Complexity: O(1)
     */
    double queryDensity(int index) const;

    /**
     * @brief Range-max query: return the maximum density over indices [l, r].
     * @param l Left boundary (inclusive, 0-based).
     * @param r Right boundary (inclusive, 0-based).
     * Complexity: O(log n)
     */
    double queryMaxDensity(int l, int r) const;

    /**
     * @brief Range-sum query: return the sum of densities over indices [l, r].
     * @param l Left boundary (inclusive, 0-based).
     * @param r Right boundary (inclusive, 0-based).
     * Complexity: O(log n)
     */
    double querySumDensity(int l, int r) const;

    /**
     * @brief Return the 0-based index of the node with the highest density.
     * Complexity: O(log n) — traverses from root to the max leaf.
     */
    int queryPeakIndex() const;

    /**
     * @brief Return the node ID at position `index`.
     */
    const std::string& getNodeId(int index) const;

    /** @brief Total number of nodes managed by this tree. */
    int size() const;

    /**
     * @brief Print the current density snapshot for all nodes.
     */
    void printDensitySnapshot() const;

private:
    // Internal tree node
    struct TreeNode {
        double maxVal = 0.0;
        double sumVal = 0.0;
    };

    int n_;                               // Number of leaf positions
    std::vector<std::string> nodeIds_;    // Ordered node ID labels
    std::vector<double> leafValues_;      // Current density values per node
    std::vector<TreeNode> tree_;          // Flat segment tree array (1-indexed, size 4*n)

    /** Build the tree recursively from the initial density array. */
    void build(int node, int start, int end);

    /** Internal recursive update. */
    void updateInternal(int node, int start, int end, int idx, double value);

    /** Internal recursive range-max query. */
    double queryMaxInternal(int node, int start, int end, int l, int r) const;

    /** Internal recursive range-sum query. */
    double querySumInternal(int node, int start, int end, int l, int r) const;

    /** Internal recursive peak index search (descend always to the max child). */
    int peakIndexInternal(int node, int start, int end) const;
};

} // namespace EvacuGraph
