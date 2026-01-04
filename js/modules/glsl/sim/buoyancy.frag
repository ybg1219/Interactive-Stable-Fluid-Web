precision highp float;

uniform sampler2D density;
uniform float dt;
uniform float buoyancy; // 부력 강도 (예: 1.0)
uniform vec2 gravity;   // 상승 방향 (예: 0.0, 1.0)

varying vec2 uv;

void main() {
    // 1. 현재 위치의 밀도(연기) 값을 읽음
    float dens = texture2D(density, uv).r;

    // 2. 밀도가 0보다 클 때만 힘을 계산
    if (dens > 0.01) {
        // 3. 밀도에 비례하는 '상승 힘'을 계산
        vec2 force = gravity * buoyancy * dens * dt;
        
        // 4. '힘'만 출력 (AdditiveBlending이 더해줌)
        gl_FragColor = vec4(force, 0.0, 1.0);
    } else {
        // 5. 밀도가 없으면 아무 힘도 더하지 않음
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}