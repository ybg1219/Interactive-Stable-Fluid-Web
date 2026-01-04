import face_vert from "./glsl/sim/face.vert";
import diffuse_frag from "./glsl/sim/diffuse.frag";

import ShaderPass from "./ShaderPass";
import * as THREE from "three";

export default class Diffuse extends ShaderPass{
    constructor(simProps){
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: diffuse_frag,
                uniforms: {
                    boundarySpace: {
                        value: simProps.boundarySpace
                    },
                    density: {
                        value: simProps.src.texture
                    },
                    density_new: {
                        value: simProps.dst_.texture
                    },
                    v: {
                        value: simProps.viscous,
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    dt: {
                        value: simProps.dt
                    }
                }
            },

            output: simProps.dst,

            output0: simProps.dst_,
            output1: simProps.dst
        })

        this.init();
    }

    update({ viscosity, iterations, dt }){
        let fbo_in, fbo_out;
        this.uniforms.v.value = viscosity;
        for(var i = 0; i < iterations; i++){
            if(i % 2 == 0){
                fbo_in = this.props.output0;
                fbo_out = this.props.output1;
            } else {
                fbo_in = this.props.output1;
                fbo_out = this.props.output0;
            }

            this.uniforms.density_new.value = fbo_in.texture;
            this.props.output = fbo_out;
            this.uniforms.dt.value = dt;

            super.update();
        }

        return fbo_out;
    }
}
