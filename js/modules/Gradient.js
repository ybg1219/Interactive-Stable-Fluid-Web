import face_vert from "./glsl/sim/face.vert";
import gradient_frag from "./glsl/sim/gradient.frag";

import ShaderPass from "./ShaderPass";

export default class Gradient extends ShaderPass{
    constructor(simProps){
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: gradient_frag,
                uniforms: {
                    density: {
                        value: simProps.src.texture
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    dt: {
                        value: simProps.dt
                    }
                }
            },
            output: simProps.dst
        })

        this.init();
    }

    update(){
        super.update();
    }
}