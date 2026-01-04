precision highp float;
uniform sampler2D density;
uniform float dt;
uniform vec2 px;
varying vec2 uv;

void main(){
    
    // 연기 그라디언트 추가
    float dL = texture2D(density, uv - vec2(px.x, 0)).r;
    float dR = texture2D(density, uv + vec2(px.x, 0)).r;
    float dB = texture2D(density, uv - vec2(0, px.y)).r;
    float dT = texture2D(density, uv + vec2(0, px.y)).r;

    vec2 grad = vec2(dR - dL, dT - dB) * 0.5;
    grad *= 2.0; // scaling
    float mag = length(grad); // gradient 크기
    vec3 color = vec3(grad.x * 0.5 + 0.5, grad.y * 0.5 + 0.5, mag); // x, y, 강도 시각화

    gl_FragColor = vec4(grad, 0, 1);
}
