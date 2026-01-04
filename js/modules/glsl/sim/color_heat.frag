precision highp float;

uniform sampler2D density;
varying vec2 uv;

// 0~1 범위의 값을 받아 색상 그라데이션을 반환하는 함수
vec3 heatmap(float v) {
    // 1. 값을 0.0 ~ 1.0 범위로 제한
    float hardness = 0.3; // ★ 이 값을 조절 (0.5: 부드러움, 2.0: 강함)
    float value = 1.0 - exp(-v * hardness);
    
    // 2. 색상 정의 (차가운 색 -> 뜨거운 색)
    vec3 coolColor = vec3(0.6, 0.1, 0.65); // 어두운 보라색 (배경)
    vec3 midColor = vec3(0.9, 0.25, 0.15);   // 진한 주황색 (중간 밀도) - 조금 더 붉게
    vec3 hotColor = vec3(1.0, 1.0, 0.0);   // ★★★ 아주 밝은 순수한 노란색 (가장 높은 밀도) ★★★
    vec3 brightestColor = vec3(1.0, 1.0, 0.8); // ★ 추가: 거의 흰색에 가까운 밝은 노랑 (최고 밀도)

    // 3. 색상 혼합 (임계값 조정)
    vec3 color = mix(coolColor, midColor, smoothstep(0.0, 0.4, value)); // 차가운 색에서 중간 색으로 전환
    color = mix(color, hotColor, smoothstep(0.4, 0.65, value));        // 중간 색에서 밝은 노란색으로 전환
    color = mix(color, brightestColor, smoothstep(0.65, 0.99, value));  // ★ 추가: 가장 밝은 노랑/흰색으로 전환
    
    return color;
}

void main() {
    
    // 밀도 텍스처의 x 채널에서 밀도 값을 읽어옵니다.
    float den = texture2D(density, uv).x;
    float alpha = smoothstep(0.05, 1.0, den);
    den = log(1.0 + den);

    // 밀도 값을 색상으로 변환합니다.
    vec3 color = heatmap(den);
    
    // 최종 색상 출력
    gl_FragColor = vec4(color, alpha);
}