#include "data_structures/SegmentTree.h"
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <algorithm>

namespace EvacuGraph {

// ─── Constructor ─────────────────────────────────────────────────────────────

SegmentTree::SegmentTree(const std::vector<std::string>& nodeIds,
                         const std::vector<double>& initialDensities)
    : n_(static_cast<int>(nodeIds.size())),
      nodeIds_(nodeIds),
      leafValues_(initialDensities),
      tree_(4 * nodeIds.size())
{
    if (nodeIds.empty()) {
        throw std::invalid_argument("[SegmentTree] Cannot build an empty tree.");
    }
    if (nodeIds.size() != initialDensities.size()) {
        throw std::invalid_argument("[SegmentTree] nodeIds and initialDensities must have the same size.");
    }
    // Recursively build the tree from the leaf data
    build(1, 0, n_ - 1);
}

// ─── Build ───────────────────────────────────────────────────────────────────

/**
 * Recursively constructs the segment tree.
 * Each internal node stores:
 *   maxVal = max over its range
 *   sumVal = sum over its range
 * Time complexity: O(n)
 */
void SegmentTree::build(int node, int start, int end) {
    if (start == end) {
        // Leaf node
        tree_[node].maxVal = leafValues_[start];
        tree_[node].sumVal = leafValues_[start];
        return;
    }

    int mid = (start + end) / 2;
    int leftChild  = 2 * node;
    int rightChild = 2 * node + 1;

    // Recursively build left and right sub-trees
    build(leftChild,  start, mid);
    build(rightChild, mid + 1, end);

    // Merge: parent stores aggregate of children
    tree_[node].maxVal = std::max(tree_[leftChild].maxVal, tree_[rightChild].maxVal);
    tree_[node].sumVal = tree_[leftChild].sumVal + tree_[rightChild].sumVal;
}

// ─── updateDensity ───────────────────────────────────────────────────────────

void SegmentTree::updateDensity(int index, double value) {
    if (index < 0 || index >= n_) {
        throw std::out_of_range("[SegmentTree] updateDensity: index out of range.");
    }
    leafValues_[index] = value;
    updateInternal(1, 0, n_ - 1, index, value);
}

/**
 * Point-update implementation.
 * Navigates down to the target leaf and propagates changes upward.
 * Time complexity: O(log n)
 */
void SegmentTree::updateInternal(int node, int start, int end, int idx, double value) {
    if (start == end) {
        // Reached the target leaf
        tree_[node].maxVal = value;
        tree_[node].sumVal = value;
        return;
    }

    int mid = (start + end) / 2;
    int leftChild  = 2 * node;
    int rightChild = 2 * node + 1;

    if (idx <= mid) {
        updateInternal(leftChild,  start, mid,     idx, value);
    } else {
        updateInternal(rightChild, mid + 1, end,   idx, value);
    }

    // Re-aggregate after child update
    tree_[node].maxVal = std::max(tree_[leftChild].maxVal, tree_[rightChild].maxVal);
    tree_[node].sumVal = tree_[leftChild].sumVal + tree_[rightChild].sumVal;
}

// ─── queryDensity ────────────────────────────────────────────────────────────

double SegmentTree::queryDensity(int index) const {
    if (index < 0 || index >= n_) {
        throw std::out_of_range("[SegmentTree] queryDensity: index out of range.");
    }
    return leafValues_[index];
}

// ─── queryMaxDensity ─────────────────────────────────────────────────────────

double SegmentTree::queryMaxDensity(int l, int r) const {
    if (l < 0 || r >= n_ || l > r) {
        throw std::out_of_range("[SegmentTree] queryMaxDensity: invalid range.");
    }
    return queryMaxInternal(1, 0, n_ - 1, l, r);
}

/**
 * Range-max query implementation.
 * Three cases:
 *   1. Segment completely outside the query range -> identity (−∞)
 *   2. Segment completely inside the query range  -> return stored max
 *   3. Partial overlap                            -> query both children and merge
 * Time complexity: O(log n)
 */
double SegmentTree::queryMaxInternal(int node, int start, int end, int l, int r) const {
    if (r < start || end < l) {
        // No overlap
        return std::numeric_limits<double>::lowest();
    }
    if (l <= start && end <= r) {
        // Complete overlap
        return tree_[node].maxVal;
    }
    // Partial overlap: query both halves
    int mid = (start + end) / 2;
    double leftMax  = queryMaxInternal(2 * node,     start, mid,     l, r);
    double rightMax = queryMaxInternal(2 * node + 1, mid + 1, end,   l, r);
    return std::max(leftMax, rightMax);
}

// ─── querySumDensity ─────────────────────────────────────────────────────────

double SegmentTree::querySumDensity(int l, int r) const {
    if (l < 0 || r >= n_ || l > r) {
        throw std::out_of_range("[SegmentTree] querySumDensity: invalid range.");
    }
    return querySumInternal(1, 0, n_ - 1, l, r);
}

/**
 * Range-sum query implementation — mirrors the range-max logic.
 * Time complexity: O(log n)
 */
double SegmentTree::querySumInternal(int node, int start, int end, int l, int r) const {
    if (r < start || end < l) {
        return 0.0;
    }
    if (l <= start && end <= r) {
        return tree_[node].sumVal;
    }
    int mid = (start + end) / 2;
    double leftSum  = querySumInternal(2 * node,     start, mid,   l, r);
    double rightSum = querySumInternal(2 * node + 1, mid + 1, end, l, r);
    return leftSum + rightSum;
}

// ─── queryPeakIndex ──────────────────────────────────────────────────────────

int SegmentTree::queryPeakIndex() const {
    return peakIndexInternal(1, 0, n_ - 1);
}

/**
 * Descend the segment tree always choosing the child with higher maxVal.
 * Time complexity: O(log n)
 */
int SegmentTree::peakIndexInternal(int node, int start, int end) const {
    if (start == end) {
        return start;
    }
    int mid = (start + end) / 2;
    double leftMax  = tree_[2 * node].maxVal;
    double rightMax = tree_[2 * node + 1].maxVal;

    if (leftMax >= rightMax) {
        return peakIndexInternal(2 * node,     start, mid);
    } else {
        return peakIndexInternal(2 * node + 1, mid + 1, end);
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const std::string& SegmentTree::getNodeId(int index) const {
    if (index < 0 || index >= n_) {
        throw std::out_of_range("[SegmentTree] getNodeId: index out of range.");
    }
    return nodeIds_[index];
}

int SegmentTree::size() const { return n_; }

void SegmentTree::printDensitySnapshot() const {
    std::cout << "  Index | Node ID         | Density" << std::endl;
    std::cout << "  ------|-----------------|----------" << std::endl;
    for (int i = 0; i < n_; ++i) {
        std::cout << "  "
                  << std::setw(5) << i << " | "
                  << std::setw(15) << std::left << nodeIds_[i] << " | "
                  << std::fixed << std::setprecision(1) << leafValues_[i]
                  << std::endl;
    }
}

} // namespace EvacuGraph
