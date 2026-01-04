precision highp float;

uniform sampler2D density;
varying vec2 uv;

void main() {
    // 밀도 텍스처의 x 채널에서 밀도 값을 읽어옵니다.
    float den = texture2D(density, uv).x;   
    // --- 1. 밀도 스케일링 ---
    
    // ★ 하드니스 값으로 밀도 변화 속도를 조절합니다.
    float hardness = 0.4; 
    // 밀도 값을 0~1 범위 내에서 비선형적으로 압축/확장합니다.
    float value = 1.0 - exp(-den * hardness);   
    // 밀도 값에 따라 투명도(알파)를 설정합니다.
    // 0.01 이하는 투명하게 만들어서 배경을 그리지 않습니다.
    float alpha = smoothstep(0.01, 1.0, den);
    
    // --- 2. 보라 - 파랑 - 하늘 - 흰색 컬러 정의 ---
    
    // 0. 보라색 (가장 낮은 밀도)
    vec3 colorA_Purple = vec3(0.55, 0.3, 0.9); // 짙은 보라
    // 1. 파란색
    vec3 colorB_Blue = vec3(0.1, 0.5, 0.9);// 표준 파랑
    // 2. 하늘색
    vec3 colorC_Cyan = vec3(0.4, 0.8, 1.0);// 밝은 하늘색 (시안)
    // 3. 흰색 (가장 높은 밀도)
    vec3 colorD_White = vec3(0.8, 1.0, 1.0);// 흰색    
    // --- 3. 색상 혼합 (Color Mapping) --- 
    vec3 finalColor;    
    // 0% ~ 30%: 보라색 (Purple) -> 파란색 (Blue)
    finalColor = mix(colorA_Purple, colorB_Blue, smoothstep(0.0, 0.4, value)); 
    
    // 30% ~ 60%: 파란색 (Blue) -> 하늘색 (Cyan)
    finalColor = mix(finalColor, colorC_Cyan, smoothstep(0.4, 0.65, value));
    
    // 60% ~ 100%: 하늘색 (Cyan) -> 흰색 (White)
    finalColor = mix(finalColor, colorD_White, smoothstep(0.65, 1.0, value));
    
    // 최종 색상 출력 (알파 값 포함)
    gl_FragColor = vec4(finalColor, alpha);
}