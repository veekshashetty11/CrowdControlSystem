# EvacuGraph: Crowd Management and Emergency Evacuation System

**EvacuGraph** is a C++17 design and analysis of algorithms (DAA) project focused on modeling large venues as directed weighted graphs to simulate, analyze, and optimize emergency evacuations.

---

## 📂 Project Structure

```
EvacuGraph/
├── include/
│   ├── data_structures/
│   │   ├── Node.h             - Represents locations (entry, corridor, hall, exits)
│   │   ├── Edge.h             - Represents pathways with flow, distance, and dynamic weights
│   │   └── Graph.h            - Layout graph manager using adjacency lists
│   ├── simulation/
│   │   ├── CrowdSimulator.h   - Controls density changes and crowd flow over time
│   │   └── EvacuationManager.h- Exit manager and routing algorithms entry point
│   └── visualization/
│       └── HeatmapGenerator.h - Graphical ASCII status heatmap renderer
│
├── src/
│   ├── data_structures/
│   │   ├── Node.cpp
│   │   ├── Edge.cpp
│   │   └── Graph.cpp
│   ├── simulation/
│   │   ├── CrowdSimulator.cpp
│   │   └── EvacuationManager.cpp
│   ├── visualization/
│   │   └── HeatmapGenerator.cpp
│   └── main.cpp               - Sets up a sample venue layout and executes the simulation
│
├── tests/                     - Automated unit tests folder
├── docs/                      - Design docs and report papers
├── assets/                    - Venue layout assets/diagrams
├── CMakeLists.txt             - Main CMake configuration
└── README.md                  - This documentation file
```

---

## 🛠️ Requirements & Compilation

To build and run EvacuGraph, you need:
- A C++17 compliant compiler (GCC 8+, Clang 7+, or MSVC 2017+)
- **CMake** version 3.12 or higher

### Build Instructions

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd EvacuGraph
   ```

2. **Create a build directory** and configure the project:
   ```bash
   mkdir build
   cd build
   cmake ..
   ```

3. **Build the executable**:
   ```bash
   cmake --build .
   ```

4. **Run EvacuGraph**:
   ```bash
   ./EvacuGraph
   ```

---

## 🧠 Core Architecture & Skeletons

### 1. Data Structures
* **`Node`**: Encapsulates coordinates, types (e.g. `ENTRY_GATE`, `EVENT_ZONE`, `EMERGENCY_EXIT`), maximum capacity, and current crowd density.
* **`Edge`**: Represents pathways. It maintains a **dynamic weight** that updates automatically when destination nodes become congested, helping routing algorithms bypass bottlenecks.
* **`Graph`**: Uses adjacency lists to represent directed routes across the venue.

### 2. Simulation & Routing
* **`CrowdSimulator`**: Simulates flow propagation step-by-step.
* **`EvacuationManager`**: Schedules exit plans and routes crowd components. 
  * *A* Search*: Finds shortest congestion-aware paths.
  * *Ford-Fulkerson*: Computes maximum possible evacuating flow from a source to an emergency exit sink.
  * *Topological Sort*: Provides evacuation scheduling priority order.

### 3. Visualization
* **`HeatmapGenerator`**: Analyzes node-level congestion and prints status bars directly to the terminal with ANSI colors matching density thresholds:
  * 🟢 **SAFE - LOW DENSITY**
  * 🟡 **WARNING - MODERATE DENSITY**
  * 🔴 **ALERT - HIGH CONGESTION**
  * 🔥 **CRITICAL - OVERCAPACITY DANGER**
