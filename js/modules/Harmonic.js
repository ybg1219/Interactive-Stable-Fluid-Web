import * as THREE from 'three';
import ShaderPass from "./ShaderPass";
import face_vert from "./glsl/sim/face.vert";
import harmonic_frag from './glsl/sim/harmonic.frag';

export default class Swirl extends ShaderPass {
    /**
     * @param {object} simProps - 시뮬레이션에 필요한 속성들
     */
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: harmonic_frag,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    fboSize: { value : simProps.fboSize },
                    // GLSL 셰이더로 전달할 유니폼 변수들
                    p0: { value: new THREE.Vector2() },     // 왼손 위치
                    p1: { value: new THREE.Vector2() },     // 오른손 위치
                    v0: { value: new THREE.Vector2() },     // 왼손의 움직임 벡터
                    v1: { value: new THREE.Vector2() },     // 오른손의 움직임 벡터
                    strength: { value: 1.0 },  
                    radius: { value: 10.0 },
                    u_osc_frequency: { value: 3.141592*0.7},
                    u_osc_strength: { value: 0.1 },
                    u_time: { value: simProps.timeSeed }, // 기본 time seed + dt 누적
                    u_osc_speed: { value: 0.2  }
                }
            },
            output: simProps.dst
        });

        this.init();
    }

    /**
     * 매 프레임 호출되어 와류 효과의 유니폼 값을 업데이트합니다.
     * @param {object} props - 외부에서 전달되는 속성들.
     * @param {object} props.left - 왼쪽 추적 데이터.
     * @param {object} props.right - 오른쪽 추적 데이터.
     * @param {Vector} cellScale - 1/width, 1/ height.
     * @param {number} cursor_size - 커서 사이즈 조정 파라미터, 클리핑
     * @param {number} mouse_force - 외력 크기 조정 파라미터
     */
    update(props) {
        const { left, right, cursor_size, dt, cellScale, mouse_force } = props;

        // 입력 데이터가 유효한지 확인합니다.
        if (!left || !right) return;
        let p0 = left.coords.clone().multiplyScalar(0.5).addScalar(0.5);
        let p1 = right.coords.clone().multiplyScalar(0.5).addScalar(0.5);
        this.uniforms.p0.value.copy(p0);
        this.uniforms.p1.value.copy(p1);

        const forceScale = 1.0;

        this.uniforms.v0.value.copy( left.diff ).multiplyScalar(forceScale);
        this.uniforms.v1.value.copy( right.diff ).multiplyScalar(forceScale);
        
        // 힘의 세기는 force 벡터의 길이에 비례하도록 설정합니다.
        this.uniforms.strength.value = mouse_force/1000.0; // 세기를 증폭시켜 효과를 명확하게 합니다.
        
        // 와류의 영향 반경은 cursor_size에 비례하도록 설정합니다.
        this.uniforms.radius.value = cursor_size / 1000.0; // 반경 스케일을 적절히 조절합니다.
        this.uniforms.fboSize.value = cellScale;
        this.uniforms.u_time.value += dt;

        // 셰이더를 렌더링합니다.
        super.update();
    }
}