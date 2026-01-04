import mouse_vert from "./glsl/sim/mouse.vert";
import externalForce_frag from "./glsl/sim/externalForce.frag";
import ShaderPass from "./ShaderPass";
// import Mouse from "./Mouse"; // -> simulation에서 파라미터로 받고 있음.
// import HandTracking from "./HandTracking";

import * as THREE from "three";

export default class ExternalForce extends ShaderPass{
    constructor(simProps){
        super({
            output: simProps.dst
        });

        this.init(simProps);
    }

    init(simProps){
        super.init();
        const mouseG = new THREE.PlaneGeometry(
            1, 1
        );

        // (0.5, 0, 0) (빨강) + (0, 0.5, 0) (초록) = (0.5, 0.5, 0) (노랑)
        const mouseM = new THREE.RawShaderMaterial({
            vertexShader: mouse_vert,
            fragmentShader: externalForce_frag,
            blending: THREE.AdditiveBlending,
            uniforms: {
                px: {
                    value: simProps.cellScale
                },
                force: {
                    value: new THREE.Vector2(0.0, 0.0)
                },
                center: {
                    value: new THREE.Vector2(0.0, 0.0)
                },
                scale: {
                    value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size)
                }
            },
        })

        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
    }

    update(props){
        // 1. 가독성을 위해 경계 값들을 변수에 저장합니다.
        

        // 최종 힘과 원본 좌표를 저장할 변수를 초기화합니다.
        const forceX = props.diff.x / 2 * props.mouse_force;;
        const forceY = props.diff.y / 2 * props.mouse_force;;
        const centerX = props.coords.x;
        const centerY = props.coords.y;

        // 유니폼 값을 업데이트합니다.
        const uniforms = this.mouse.material.uniforms;
        uniforms.force.value.set(forceX, forceY);
        uniforms.center.value.set(centerX, centerY);
        uniforms.scale.value.set(props.cursor_size, props.cursor_size);

        // 셰이더를 렌더링합니다.
        super.update();
    }

}