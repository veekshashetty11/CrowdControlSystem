#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include <string>
#include "data_structures/SegmentTree.h"

using namespace EvacuGraph;

// Helper: compare doubles within epsilon
bool approxEq(double a, double b, double eps = 1e-6) {
    return std::fabs(a - b) < eps;
}

// ─── Test 1: Basic build and queryDensity ────────────────────────────────────
void testBuildAndQuery() {
    std::cout << "  - Running testBuildAndQuery..." << std::endl;

    std::vector<std::string> ids = {"Gate_A", "Hall_1", "Corridor_1", "Exit_A"};
    std::vector<double> densities = {120.0, 950.0, 20.0, 0.0};

    SegmentTree st(ids, densities);

    assert(st.size() == 4);
    assert(approxEq(st.queryDensity(0), 120.0));
    assert(approxEq(st.queryDensity(1), 950.0));
    assert(approxEq(st.queryDensity(2), 20.0));
    assert(approxEq(st.queryDensity(3), 0.0));

    std::cout << "    * Passed!" << std::endl;
}

// ─── Test 2: updateDensity ───────────────────────────────────────────────────
void testUpdateDensity() {
    std::cout << "  - Running testUpdateDensity..." << std::endl;

    std::vector<std::string> ids = {"A", "B", "C"};
    std::vector<double> densities = {10.0, 20.0, 30.0};

    SegmentTree st(ids, densities);

    // Update B's density to 99.0
    st.updateDensity(1, 99.0);
    assert(approxEq(st.queryDensity(1), 99.0));

    // A and C should be unchanged
    assert(approxEq(st.queryDensity(0), 10.0));
    assert(approxEq(st.queryDensity(2), 30.0));

    std::cout << "    * Passed!" << std::endl;
}

// ─── Test 3: queryMaxDensity range ───────────────────────────────────────────
void testQueryMaxDensity() {
    std::cout << "  - Running testQueryMaxDensity..." << std::endl;

    std::vector<std::string> ids = {"A", "B", "C", "D", "E"};
    std::vector<double> densities = {5.0, 3.0, 8.0, 1.0, 6.0};

    SegmentTree st(ids, densities);

    // Full range max = 8.0 (C)
    assert(approxEq(st.queryMaxDensity(0, 4), 8.0));
    // Range [0,1] max = 5.0
    assert(approxEq(st.queryMaxDensity(0, 1), 5.0));
    // Range [2,4] max = 8.0
    assert(approxEq(st.queryMaxDensity(2, 4), 8.0));
    // Single element [3,3] = 1.0
    assert(approxEq(st.queryMaxDensity(3, 3), 1.0));

    // Update D to 100.0, now full range max = 100.0
    st.updateDensity(3, 100.0);
    assert(approxEq(st.queryMaxDensity(0, 4), 100.0));

    std::cout << "    * Passed!" << std::endl;
}

// ─── Test 4: querySumDensity range ───────────────────────────────────────────
void testQuerySumDensity() {
    std::cout << "  - Running testQuerySumDensity..." << std::endl;

    std::vector<std::string> ids = {"A", "B", "C", "D"};
    std::vector<double> densities = {10.0, 20.0, 30.0, 40.0};

    SegmentTree st(ids, densities);

    // Full range sum = 100
    assert(approxEq(st.querySumDensity(0, 3), 100.0));
    // Left half sum = 30
    assert(approxEq(st.querySumDensity(0, 1), 30.0));
    // Right half sum = 70
    assert(approxEq(st.querySumDensity(2, 3), 70.0));

    // Update A to 0, full sum becomes 90
    st.updateDensity(0, 0.0);
    assert(approxEq(st.querySumDensity(0, 3), 90.0));

    std::cout << "    * Passed!" << std::endl;
}

// ─── Test 5: queryPeakIndex ──────────────────────────────────────────────────
void testQueryPeakIndex() {
    std::cout << "  - Running testQueryPeakIndex..." << std::endl;

    std::vector<std::string> ids = {"Gate_A", "Hall_1", "Hall_2", "Exit_A"};
    std::vector<double> densities = {120.0, 950.0, 380.0, 0.0};

    SegmentTree st(ids, densities);

    // Index 1 (Hall_1) has highest density = 950
    assert(st.queryPeakIndex() == 1);

    // Shift peak to Exit_A (index 3)
    st.updateDensity(3, 2000.0);
    assert(st.queryPeakIndex() == 3);

    std::cout << "    * Passed!" << std::endl;
}

int main() {
    std::cout << "\033[1;35m";
    std::cout << "====================================================\n";
    std::cout << "     EvacuGraph: Running Segment Tree Tests         \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";

    testBuildAndQuery();
    testUpdateDensity();
    testQueryMaxDensity();
    testQuerySumDensity();
    testQueryPeakIndex();

    std::cout << "\033[1;32m";
    std::cout << "\n====================================================\n";
    std::cout << "       ALL TESTS COMPLETED SUCCESSFULLY!            \n";
    std::cout << "====================================================\n";
    std::cout << "\033[0m";
    return 0;
}
