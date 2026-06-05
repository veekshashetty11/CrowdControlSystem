cmake_minimum_required(VERSION 3.12)
project(EvacuGraph VERSION 1.0.0 LANGUAGES CXX)

# Enforce Modern C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Strict warnings to maintain high code quality standards
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror -O3)
endif()

# Source files list
set(SRC_FILES
    src/data_structures/Node.cpp
    src/data_structures/Edge.cpp
    src/data_structures/Graph.cpp
    src/data_structures/SegmentTree.cpp
    src/simulation/CrowdSimulator.cpp
    src/simulation/EvacuationManager.cpp
    src/visualization/HeatmapGenerator.cpp
    src/algorithms/astar.cpp
    src/algorithms/evacuation.cpp
    src/algorithms/maxflow.cpp
    src/main.cpp
)

# Output executable target
add_executable(EvacuGraph ${SRC_FILES})

# Include headers path
target_include_directories(EvacuGraph PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

# Include test project subdirectory
add_subdirectory(tests)
