import face_vert from "./glsl/sim/face.vert";
import buoyancy_frag from "./glsl/sim/buoyancy.frag"; // ⬅️ 새 셰이더
import ShaderPass from "./ShaderPass";
import * as THREE from "three";

export default class Buoyancy extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: buoyancy_frag,
                // ★ 1. 힘을 '더하기' 위한 AdditiveBlending
                blending: THREE.AdditiveBlending, 
                uniforms: {
                    density: {
                        value: simProps.density.texture 
                    },
                    dt: {
                        value: simProps.dt
                    },
                    buoyancy: {
                        value: 1.0 
                    },
                    gravity: {
                        value: new THREE.Vector2(0.0, 1.0)
                    } 
                },
            },
            // ★ 5. '속도' 텍스처에 덮어씀
            output: simProps.dst // (createShaderPass에서 vel_1로 설정)
        });
        this.init();
    }

    update({ dt, buoyancy }) {
        this.uniforms.dt.value = dt;
        this.uniforms.buoyancy.value = buoyancy;
        
        super.update();
    }
}