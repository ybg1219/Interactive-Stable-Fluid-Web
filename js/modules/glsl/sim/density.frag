precision highp float;

// --- 소스 위치 ---
uniform vec2 pointPositions[MAX_TOTAL_PARTS];
uniform vec2 linePositions[MAX_TOTAL_PARTS*2];
uniform int lineCount; // 유효한 선의 개수
uniform int pointCount; // 유효한 선의 개수

// --- 입력 밀도 ---
// (Advection과 Diffuse가 완료된 텍스처를 읽어옴)
uniform sampler2D density; 

// --- 소스 설정 ---
uniform float radius;    // 소싱 반경
uniform float strength;  // 밀도 증가량

// --- 헬퍼 유니폼 ---
varying vec2 uv;
uniform vec2 px;
uniform vec2 fboSize; // (헬퍼 함수에서만 사용)

// ------------------------------------
// 헬퍼 함수 (Sourcing용)
// ------------------------------------

// 공통 falloff 함수
float falloff(float d, float radius) {
    return pow(1.0 - smoothstep(0.0, radius, d), 2.0);
}

// 종횡비 보정 함수
vec2 normalizeToAspect(vec2 v) {
    vec2 scale = max(px.x, px.y) / px;
    return v * scale;
}

// 점 falloff (종횡비 고려)
float computeFalloff(vec2 p, vec2 center, float radius) {
    float scale = max(px.x, px.y);
    radius *= scale; // px 단위 -> uv 단위

    vec2 np = normalizeToAspect(p);
    vec2 nc = normalizeToAspect(center);
    float d = distance(np, nc);

    return falloff(d, radius);
}

// 선 거리 계산 (SDF 기반)
float sdLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// 선 falloff (종횡비 고려)
float sdfLineFalloff(vec2 p, vec2 a, vec2 b, float radius) {
    float scale = max(px.x, px.y);
    radius *= scale;

    vec2 np = normalizeToAspect(p);
    vec2 na = normalizeToAspect(a);
    vec2 nb = normalizeToAspect(b);

    float d = sdLine(np, na, nb);
    return falloff(d, radius);
}

// ------------------------------------
// 메인 함수
// ------------------------------------
void main() {

    // --- 1. 연기 소싱 (Sourcing) ---
    float source = 0.0;

    // 1-1. 점 소스 계산
    for (int i = 0; i < MAX_TOTAL_PARTS; i++) {
        if (i >= pointCount) break;
        vec2 p = pointPositions[i];
        if (p.x < 0.0 || p.y < 0.0) continue;
        source += strength * computeFalloff(uv, pointPositions[i], radius) * 0.3;
    }

    // 1-2. 선 소스 계산
    for (int i = 0; i < MAX_TOTAL_PARTS ; i++) {
        if (i >= lineCount) break;
        vec2 p1 = linePositions[i * 2];
        vec2 p2 = linePositions[i * 2 + 1];
        source += strength * sdfLineFalloff(uv, p1, p2, radius * 0.7) * 0.2;
    }

    // --- 2. 소멸 (Dissipation) ---
    // Advection(이류)이 빠졌으므로, 'uv' (현재 픽셀)에서 밀도를 읽어옵니다.
    float prevDensity = texture2D(density, uv).x;

    // dissipation 소멸 계수
    float lambda = 0.97;
    float dv = lambda * prevDensity; // 읽어온 값에 소멸 적용

    // --- 3. 최종 밀도 = 소멸된 밀도 + 새 소스 ---
    float finalDensity = dv + source;

    // r=g=b=a로 밀도 저장
    gl_FragColor = vec4(finalDensity, 0.0, 0.0, 1.0); 
}