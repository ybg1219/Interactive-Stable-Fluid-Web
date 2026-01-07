# Interactive Stable Fluid Web
![WebGL](https://img.shields.io/badge/WebGL-GLSL-blue) ![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow) ![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-orange)

An interactive web-based framework for visualizing real-time pose-driven fluid (smoke) simulation using WebGL and Harmonic Function Mapping.

This project implements and visualizes a novel fluid interaction framework designed to overcome the limitations of conventional global noise methods. By combining **Harmonic Function Mapping** for localized control and **Simplex Noise** for natural turbulence, this framework provides a robust solution for generating high-fidelity smoke effects that react dynamically to user gestures directly in a web browser.

## Live Demo
[![Live Demo Thumbnail](readme/demo.gif)](https://github.com/ybg1219/Interactive-Stable-Fluid-Web)

↑ ↑ **Click the image above to see the simulation in action** ↑ ↑


## Table of Contents
1. [Background](#1-background)
2. [Core Algorithms](#2-core-algorithms)
3. [Pipeline](#3-pipeline)
4. [Key Features](#4-key-features)
5. [Tech Stack](#5-tech-stack)
6. [Usage](#6-usage)

---

## 1. Background
Standard methods for interactive fluid simulation often face trade-offs between responsiveness and visual realism. Conventional approaches suffer from two major drawbacks:

* **Unnatural Boundaries:** Directly injecting skeleton tracking coordinates as external forces leads to sharp, jagged boundaries and temporally discontinuous motion.
* **Lack of Local Control:** Global turbulence methods (like standard Perlin/Simplex noise) apply texture-like effects globally, failing to reflect the specific directionality and energy of user gestures.

This project addresses these issues by implementing a **Harmonic Function Mapping** technique specifically tailored for pose-driven data, ensuring that the fluid flows naturally and energetically from the user's movements without losing its smoke-like qualities.

<p align="center">
  <img src="readme/Fig2.png" width="900"/>
  <br>
  <b>Figure 2. Comparison of turbulence generation methods.</b> (a) Raw density visualization shows sharp boundaries; (b) Simplex Noise lacks local responsiveness; (c) Harmonic Mapping alone creates structured waves; (d) The proposed combined method achieves natural, pose-responsive turbulence.
</p>

## 2. Core Algorithms
This framework is built upon two key technical contributions to solve the challenges of web-based fluid interaction:

### Harmonic Function Mapping
To overcome the limitations of global noise, this method generates a smoothly diverging vector field around the user's skeleton. It calculates a "harmonic oscillation" based on the distance and direction from skeleton segments. Crucially, an **Adjusted Harmonic Function** ($H(x)$) is used—shifted and scaled to remain non-negative—to prevent unintended force reversals. This ensures stable, directional energy transfer from the user to the fluid.

<p align="center">
  <img src="readme/Fig3.png" width="720"/>
  <br>
  <b>Figure 3. Harmonic Function Mapping Algorithm.</b> The process involves linear interpolation on skeleton segments, vector computation, and the application of harmonic oscillation with Gaussian attenuation.
</p>
The algorithm generates external forces at the pixel level relative to skeleton segments through the following steps:

1.  **Linear Interpolation:** Computes the projection point and interpolation ratio ($t$) on the segment.
2.  **Vector Computation:** Calculates the direction vector ($\vec{d}$) and distance ($d$) toward the current pixel.
3.  **Adjusted Harmonic Oscillation:**
    To prevent unintended force reversal caused by negative values in the base function ($\cos(x)\sin(4x)$), a **shifted and scaled function $H(x)$** is applied to ensure non-negative values.
4.  **Attenuation:** Applies **Gaussian Attenuation** to create a smooth force field diverging from the segment center.

### Stable Fluids Solver
To enable real-time performance on the web, the framework incorporates **Jos Stam's Stable Fluids** algorithm. Implemented via WebGL fragment shaders, it utilizes a **Semi-Lagrangian Advection** scheme to ensure numerical stability even at large time steps. This solver manages the velocity and density fields, handling advection, diffusion, and projection steps efficiently on the GPU.

## 3. Pipeline
The framework processes data through the pipeline illustrated in Figure 1. It utilizes an asynchronous architecture to maintain high frame rates.

<p align="center">
  <img src="readme/Fig1.png" width="720"/>
  <br>
  <b>Figure 1. Software Architecture.</b> Overall data flow from webcam input to final rendering.
</p>


1.  **Webcam Stream Input:** Acquires real-time video frames from the user's device.
2.  **Pose Detection (Web Worker):** Uses **MediaPipe** to infer 33 joint landmarks. This process is offloaded to a **Web Worker** to decouple heavy computation from the main rendering loop, preventing frame drops.
3.  **Force Field Generation:** Converts pose data into external forces using **Harmonic Function Mapping** combined with background Simplex Noise.
4.  **Fluid Simulation:** Updates velocity and density fields using the GPU-accelerated Stable Fluids solver.
5.  **Rendering:** Visualizes the fluid with customizable styles (color, AR composition) in the fragment shader.

## 4. Key Features

### Interaction & Performance
* **Real-Time Pose Tracking:** Decoupled Web Worker architecture ensures smooth tracking without UI lag.
* **Localized Fluid Control:** Fluid responds dynamically to the direction and speed of specific body parts (hands, arms).
* **No Plugins Required:** Runs entirely in standard browsers (Chrome, Edge) using HTML5 and WebGL.

### Visual Customization
* **Style Variations:** Toggle between different visual tones (Cool/Warm) by modifying the color mapping in real-time.
<p align="center">
  <img src="readme/Fig9.png" width="720"/>
  <br>
  <b>Figure 9. Visual Style Variations</b>
</p>

* **AR-like Composition:** Overlay the simulated smoke onto the live webcam feed for an Augmented Reality experience.

<p align="center">
  <img src="readme/Fig10.png" width="720"/>
  <br>
  <b>Figure 10. AR-like Composition.</b> The smoke layer is composited over the live video feed.
</p>

### Comprehensive UI Controls
* **Simulation Parameters:** Adjust `Oscillation Strength`, `Simplex Noise Strength`, `Buoyancy`, and `Viscosity` on the fly.
* **Debug Options:** Toggle mouse interaction vs. webcam interaction to test fluid behaviors independently.

## 5. Tech Stack
* **Language:** JavaScript (ES6+), GLSL (OpenGL Shading Language).
* **Core Logic:** WebGL for GPU-accelerated physics simulation.
* **AI/CV:** MediaPipe Pose for skeleton tracking.
* **Parallel Processing:** Web Workers for asynchronous data handling.
* **Frontend:** HTML5, CSS3, tailwind.css.

## 6. Usage

### Requirements
* A modern web browser with WebGL support (e.g., Chrome, Firefox, Edge).
* A functional webcam.

### Running the Application
1.  Clone this repository to your local machine.
2.  Open the project folder in Visual Studio Code.
3.  Install the necessary dependencies:
    ```bash
    npm install
    ```
4.  Start the local development server:
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to the local URL provided in the terminal (usually `http://localhost:3001` or similar).
6.  Allow webcam access when prompted by the browser.

### Configuration
You can adjust initial parameters in the GUI panel (top-right corner):
* **`osc_strength`**: Controls the intensity of the harmonic force from your body.
* **`n_strength`**: Controls the intensity of the background Simplex noise.
* **`buoyancy`**: Adjusts how fast the smoke rises.
* **`cursor_size`**: Controls the radius of smoke emission from joints.