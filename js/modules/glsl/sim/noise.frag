precision highp float;
uniform vec2 fboSize;
uniform float u_time;
uniform float strength;
// uniform vec2 px;
varying vec2 uv;

// --- 2D Simplex Noise 함수 ---
// update_vs.glsl의 3D snoise를 2D 버전으로 간소화한 함수입니다.
// 2D 공간의 한 점(v)을 입력받아 -1과 1 사이의 부드러운 노이즈 값을 반환합니다.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    // --- 상수 정의 ---
    // 심플렉스 노이즈 계산에 사용되는 수학적 상수 공간을 왜곡하고(skew) 다시 복원하는 데 사용.
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    // --- 1단계: 공간 왜곡 및 기준 꼭짓점 찾기 ---
    // 정사각형 격자를 삼각형 격자로 변환(왜곡)하여 계산을 단순화합니다.
    // i: 현재 점 v가 속한 삼각형 격자 셀의 기준 꼭짓점 (정수 좌표)
    vec2 i  = floor(v + dot(v, C.yy));
    // x0: 기준 꼭짓점에서 현재 점 v까지의 상대적인 위치 벡터
    vec2 x0 = v -   i + dot(i, C.xx);

    // --- 2단계: 나머지 두 꼭짓점 찾기 ---
    // 현재 점이 기준 꼭짓점을 기준으로 어느 쪽에 있는지(x0.x > x0.y) 판별하여
    // 삼각형의 나머지 두 꼭짓점의 상대적 위치(i1)를 결정합니다.
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x1, x2: 나머지 두 꼭짓점에서 현재 점 v까지의 상대적인 위치 벡터들
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    // --- 3단계: 꼭짓점에 무작위성 부여 (해싱/순열) ---
    // 각 꼭짓점의 정수 좌표(i, i1)를 해시 함수(permute)에 넣어 뒤섞습니다.
    // 이를 통해 각 꼭짓점마다 고유하고 일관된 (의사)무작위 값을 부여합니다.
    i = mod289(i);
    // p: 3개 꼭짓점의 해시 값을 x, y, z 채널에 각각 저장한 벡터.
    // (GPU 최적화를 위해 vec3를 사용)
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));

    // --- 4단계: 각 꼭짓점의 영향력(가중치) 계산 ---
    // m: 각 꼭짓점으로부터의 거리가 멀어질수록 부드럽게 0에 가까워지는 가중치 값.
    // dot(x,x)는 거리의 제곱을 의미하며, 가까울수록 m 값이 커집니다.
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    // 가중치 곡선을 더 부드럽게 만들기 위해 제곱을 여러 번 해줍니다.
    m = m*m;
    m = m*m;

    // --- 5단계: 기울기(Gradient) 계산 및 최종 값 혼합 ---
    // x: 해시 값 p를 사용하여 각 꼭짓점에 할당된 그래디언트 벡터의 기초 값을 계산합니다.
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // 이전에 계산한 가중치(m)에 그래디언트의 크기를 곱하여 최종 영향력을 조절합니다.
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // g: 각 꼭짓점의 그래디언트와 거리 벡터를 내적(dot product)한 결과.
    // 이는 각 꼭짓점이 최종 노이즈 값에 얼마나 기여하는지를 나타냅니다.
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);

    // --- 최종 반환 ---
    // 3개 꼭짓점의 최종 기여도(g)와 가중치(m)를 모두 내적하여 합산합니다.
    return dot(m, g);
}

// --- Curl Noise 계산 함수 ---

// 1. 포텐셜(Potential, ψ) 계산
// 2D에서는 포텐셜은 그냥 노이즈 값 그 자체입니다.
float getPotential(vec2 p) {
    float scale = 8.0;
    float time = mod(u_time, 289.0)* 0.3;
    vec2 offset_p = p * scale - vec2(0.0 , time);
    return snoise(offset_p);
}

// 2. 2D Curl 계산
// v = (∂ψ/∂y, -∂ψ/∂x)
vec2 computeCurl(vec2 p) {
    float e = 0.001; // 미분을 위한 아주 작은 거리

    // y에 대한 편미분 (∂ψ/∂y)
    float potentialY1 = getPotential(vec2(p.x, p.y + e));
    float potentialY2 = getPotential(vec2(p.x, p.y - e));
    float dPsiDy = (potentialY1 - potentialY2) / (2.0 * e);

    // x에 대한 편미분 (∂ψ/∂x)
    float potentialX1 = getPotential(vec2(p.x + e, p.y));
    float potentialX2 = getPotential(vec2(p.x - e, p.y));
    float dPsiDx = (potentialX1 - potentialX2) / (2.0 * e);

    return vec2(dPsiDy, -dPsiDx);
}

// --- 메인 함수 ---
void main() {
    // 현재 픽셀의 좌표를 -1.0 ~ 1.0 범위로 정규화합니다.
    // u_resolution.y / u_resolution.x 를 곱해 화면 비율을 보정합니다.
    // vec2 uv = (gl_FragCoord.xy * 2.0 - fboSize.xy) / fboSize.y;
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    // vec2 vel = texture2D(velocity, uv).xy;

    // 시간에 따라 흐르도록 uv 좌표에 u_time을 더해줍니다.
    vec2 p = uv;// - vel * dt * ratio;

    // 현재 위치(p)에서 컬 노이즈 속도 벡터를 계산합니다.
    vec2 curl = computeCurl(p);

    // 속도 벡터를 시각화합니다.
    // x축 속도는 R(빨강) 채널, y축 속도는 G(초록) 채널에 매핑합니다.
    gl_FragColor = vec4( curl * 0.01 * strength , 0.0, 1.0);
}