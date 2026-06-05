# Tests CMake configuration for EvacuGraph

set(TEST_SRC
    test_graph.cpp
    ../src/data_structures/Node.cpp
    ../src/data_structures/Edge.cpp
    ../src/data_structures/Graph.cpp
)

add_executable(test_graph ${TEST_SRC})

# Target Include Directories pointing to root include/ folder
target_include_directories(test_graph PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../include)

# Add test_evac target
set(TEST_EVAC_SRC
    test_evac.cpp
    ../src/data_structures/Node.cpp
    ../src/data_structures/Edge.cpp
    ../src/data_structures/Graph.cpp
    ../src/algorithms/evacuation.cpp
)

add_executable(test_evac ${TEST_EVAC_SRC})
target_include_directories(test_evac PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../include)

# Add test_maxflow target
set(TEST_MAXFLOW_SRC
    test_maxflow.cpp
    ../src/data_structures/Node.cpp
    ../src/data_structures/Edge.cpp
    ../src/data_structures/Graph.cpp
    ../src/algorithms/maxflow.cpp
)

add_executable(test_maxflow ${TEST_MAXFLOW_SRC})
target_include_directories(test_maxflow PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../include)

# Add test_segtree target
set(TEST_SEGTREE_SRC
    test_segtree.cpp
    ../src/data_structures/Node.cpp
    ../src/data_structures/Edge.cpp
    ../src/data_structures/Graph.cpp
    ../src/data_structures/SegmentTree.cpp
)

add_executable(test_segtree ${TEST_SEGTREE_SRC})
target_include_directories(test_segtree PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../include)
