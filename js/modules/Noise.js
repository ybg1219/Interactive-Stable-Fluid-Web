import face_vert from "./glsl/sim/face.vert";
import padding_vert from "./glsl/sim/padding.vert";

import noise_frag from "./glsl/sim/noise.frag";
import ShaderPass from "./ShaderPass";

import * as THREE from "three";


export default class Noise extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: padding_vert,
                fragmentShader: noise_frag,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    strength: { 
                        value: simProps.strength || 0.1 
                    },
                    fboSize: {
                        value: simProps.fboSize
                    },
                    dt: {
                        value: simProps.dt
                    },
                    boundarySpace: { 
                        value: simProps.cellScale 
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    u_time: {
                        value: 0.0
                    },
                },
            },
            output: simProps.dst
        });

        this.init();
    }

    init() {
        super.init();
    }

    update({ fboSize, dt, strength }) {
        this.uniforms.fboSize.value = fboSize;
        this.uniforms.u_time.value += dt;
        this.uniforms.strength.value = strength;

        super.update();
    }
}