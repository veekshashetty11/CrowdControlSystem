# EvacuGraph 

A Graph-Based Crowd Management and Emergency Evacuation System built using Design and Analysis of Algorithms (DAA) concepts.

EvacuGraph simulates crowd movement in large venues such as stadiums, concerts, festivals, temples, malls, and college events. The system monitors crowd density, detects congestion, predicts risk zones, and computes optimal evacuation routes using advanced graph algorithms.

---

## Problem Statement

Large gatherings often face challenges such as:

- Overcrowding
- Traffic bottlenecks
- Slow evacuation during emergencies
- Uneven crowd distribution
- Stampede risks

EvacuGraph addresses these challenges through real-time crowd simulation, route optimization, and crowd flow analysis.

---

## Objectives

- Monitor crowd movement in real time
- Detect congestion and bottlenecks
- Recommend safer alternative routes
- Optimize crowd distribution
- Support emergency evacuation planning
- Visualize crowd density using heatmaps

---

## System Design

The venue is modeled as a **weighted directed graph**.

### Nodes
Represent:

- Entry Gates
- Corridors
- Event Zones
- Halls
- Emergency Exits

### Edges
Represent:

- Pathways between zones
- Corridor capacities
- Travel distance
- Crowd density weights

---

## Algorithms Used

### A* Search Algorithm
Used for:
- Finding shortest and safest routes
- Dynamic path recalculation

**Time Complexity:** O(E log V)

---

### Breadth First Search (BFS)
Used for:
- Emergency evacuation planning
- Nearest exit discovery

**Time Complexity:** O(V + E)

---

### Depth First Search (DFS)
Used for:
- Risk zone analysis
- Detecting dangerous crowd accumulation patterns

**Time Complexity:** O(V + E)

---

### Ford-Fulkerson Algorithm
Used for:
- Maximum crowd flow calculation
- Bottleneck identification

**Time Complexity:** O(E × MaxFlow)

---

### Min-Cost Max-Flow
Used for:
- Crowd distribution optimization
- Load balancing across exits

---

### Topological Sort
Used for:
- Evacuation priority scheduling

**Time Complexity:** O(V + E)

---

### Segment Tree
Used for:
- Fast crowd density updates
- Range density queries

**Time Complexity:**
- Update: O(log n)
- Query: O(log n)

---

## ✨ Features

### Real-Time Crowd Simulation
- Dynamic crowd generation
- Live movement updates
- Density recalculation

### Congestion Detection
- Identify overloaded zones
- Detect bottlenecks

### Route Optimization
- Alternate route suggestions
- Shortest safe path computation

### Emergency Evacuation
- Multi-exit evacuation planning
- Safe path recommendations

### Heatmap Visualization
- Low Density Zones
- Moderate Density Zones
- High Risk Areas

### Analytics Dashboard
- Crowd statistics
- Density trends
- Evacuation metrics

---

## 📂 Project Structure
