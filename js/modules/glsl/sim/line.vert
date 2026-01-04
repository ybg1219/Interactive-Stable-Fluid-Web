attribute vec3 position;
varying vec2 uv;
uniform vec2 px;


precision highp float;

void main(){
    vec3 pos = position; // buffer geometry 정점 위치 복사
    uv = 0.5 + pos.xy * 0.5; // -1 ~1 -> 0 ~1 범위로 변환환
    vec2 n = sign(pos.xy); // 양수 : 1 음수 : -1 0: 0 반환
    pos.xy = abs(pos.xy) - px * 1.0; // 셀 한칸 만큼 당겨옴
    pos.xy *= n; // 부호 복구
    gl_Position = vec4(pos, 1.0);
}