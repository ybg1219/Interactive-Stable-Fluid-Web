# Real-Time Interactive Smoke Simulation on the Web

## 📝 Overview

[cite_start]본 프로젝트는 **웹 브라우저 환경에서 별도의 설치 없이 실시간으로 사용자 움직임에 반응하는 유체(연기) 시뮬레이션 프레임워크**입니다. **WebGL 기반의 Stable Fluids 솔버**와 **MediaPipe 포즈 추정**을 결합하여, 사용자의 신체 움직임을 자연스러운 연기 흐름으로 변환합니다.

[cite_start]특히 기존의 Simplex Noise 기반 전역(Global) 난류 생성 방식이 갖는 '사용자 의도 전달의 한계'를 극복하기 위해, **조화 함수(Harmonic Function) 매핑을 이용한 국소적(Local) 외력 생성 기법**을 제안합니다. 이를 통해 관절 주변에서 방향성과 에너지를 보존하는 유체 흐름을 생성합니다.

> 💡 **Reference Implementation**
> 본 저장소는 논문 *"A Web-Based Framework for Real-Time Pose-Driven Fluid Interaction via Harmonic Function Mapping"* 의 공식 구현체로, 웹 환경에서의 고품질 실시간 상호작용을 실증합니다.

---

## 🏗 System Architecture

<p align="center">
  <img src="readme/Fig1.png" width="720"/>
  <br>
  <b>Figure 1. Software Architecture</b>
</p>

본 시스템은 **Web Worker 기반의 비동기 파이프라인**을 통해 고성능 실시간 처리를 구현했습니다.

1.  **Webcam Stream Input**
    웹캠으로부터 실시간 비디오 프레임을 획득합니다.
2.  **Pose Detection (MediaPipe on Web Worker)**
    계산 비용이 높은 포즈 추론 과정을 **Web Worker**로 분리하여 메인 스레드의 부하를 줄이고, 렌더링 루프의 끊김 없는(stable) 프레임률을 보장합니다.
3.  **Fluid Simulation Solver (Stable Fluids)**
    **Jos Stam의 Stable Fluids** 기법(Semi-Lagrangian Advection)을 WebGL Shader로 구현하여, 빠른 유속에서도 수치적으로 안정적인 시뮬레이션을 수행합니다.
4.  **Force Field Generation (Proposed)**
    스켈레톤 선분을 기준으로 **조화 함수(Harmonic Function) 매핑**을 수행하여, 사용자 동작의 방향성을 반영하는 외력을 생성합니다.
5.  **Rendering (WebGL / GLSL)**
    계산된 밀도장(Density Field)을 시각화하며, Fragment Shader를 통해 실시간 스타일 변경이 가능합니다.

---

## 🌊 Turbulence Generation Comparison

<p align="center">
  <img src="readme/Fig2.png" width="900"/>
  <br>
  <b>Figure 2. Comparison of Turbulence Generation Methods</b>
</p>

* **(a) Raw Density Visualization**
    스켈레톤 좌표를 직접 외력으로 사용할 경우, 관절 주변 경계가 날카롭고 부자연스럽게 나타납니다.
* **(b) Simplex Noise + Buoyancy**
    전역적인 난류는 형성되지만, 텍스처 형태의 노이즈로 인해 사용자 움직임에 대한 국소적 반응성이 떨어집니다.
* **(c) Harmonic Function Mapping Only**
    규칙적인 파동 패턴은 형성되나, 자연스러운 연기의 불규칙성이 부족합니다.
* **(d) Proposed Method (Combined)**
    **조화 함수 매핑(Local)과 Simplex Noise(Global)를 동적으로 결합**하여, 사용자의 **실루엣(형태)을 유지**하면서도 역동적인 연기 흐름을 생성합니다.

---

## ⚡ Harmonic Function–Based Force Mapping

<p align="center">
  <img src="readme/Fig3.png" width="720"/>
  <br>
  <b>Figure 3. Harmonic Function Mapping Algorithm</b>
</p>

스켈레톤을 구성하는 선분을 기준으로, 픽셀 단위에서 다음 과정을 수행하여 외력을 생성합니다.

1.  **선형 보간 (Linear Interpolation):** 선분 상의 투영 위치 및 비율($t$) 계산
2.  **벡터 산출:** 픽셀로 향하는 방향 벡터($\vec{d}$) 및 거리($d$) 계산
3.  **조화 진동 함수 (Adjusted Harmonic Oscillation):**
    기본 조화 함수($\cos(x)\sin(4x)$)의 음수 값으로 인한 힘의 역전 현상을 방지하기 위해, **0 이상으로 보정(Shift & Scale)된 함수 $H(x)$**를 적용합니다[cite: 119, 120].
4.  **감쇠 적용:** 가우시안 감쇠(Gaussian Attenuation)를 통해 선분 중심에서 발산하는 부드러운 힘을 생성합니다[cite: 114].

이 방식은 전역 노이즈에 의존하지 않고, **사용자 움직임에 직접적으로 연동되는 국소적(force-localized) 유체 제어**를 가능하게 합니다.

---

## 🎨 Visual Style and AR Composition

### Visual Style Variations

<p align="center">
  <img src="readme/Fig9.png" width="720"/>
  <br>
  <b>Figure 9. Visual Style Variations</b>
</p>

Fragment Shader의 컬러 매핑을 수정하여 시뮬레이션의 물리적 동작에 영향을 주지 않고 시각적 스타일(Cool/Warm tone 등)을 실시간으로 변경할 수 있습니다.

### AR-like Composition with Background Video

<p align="center">
  <img src="readme/Fig10.png" width="720"/>
  <br>
  <b>Figure 10. AR-like Composition with Background Video</b>
</p>

배경 영상 오버레이 기능을 활성화하면, 실시간 웹캠 피드 위에 연기 레이어가 합성되어 사용자가 실제 공간에서 연기를 조작하는 듯한 **증강현실(AR) 효과**를 경험할 수 있습니다.

---

## 🚀 Features & Demo

<p align="center">
  <img src="readme/demo.gif" width="720"/>
</p>

* ✅ **No Plugins Required:** 표준 웹 브라우저 및 웹캠만으로 즉시 실행.
* ✅ **Real-Time Performance:** Web Worker 및 GPU 가속을 통한 안률 확보.
* ✅ **Intuitive Interaction:** 조화 함수 매핑을 통한 제스처 반어.
* ✅ **Customizable:** 난류 강도, 부력, 시각 스타일 등 다양한 파라미터 실시간 조절 가능.