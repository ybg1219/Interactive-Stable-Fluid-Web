import Common from "./Common";
import * as THREE from "three";

import Simulation from "./Simulation";
import face_vert from "./glsl/sim/face.vert";
import color_frag from "./glsl/sim/color.frag";
import color_heat from "./glsl/sim/color_heat.frag";
import color_grad from "./glsl/sim/color_grad.frag";

export default class Output{
     /**
     * @param {object} props - Webgl.js에서 전달받는 속성. { activeTracker, options }를 포함합니다.
     */
    constructor(props) {
        this._destroyed = false; // 리소스 해제 플래그 추가
        this.init(props);
    }

    /**
     * @param {object} props - 생성자에서 전달받은 활성화된 tracking 모듈
     */
    init(props) {
        this.simulation = new Simulation(props);

        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        this.output = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: face_vert,
                fragmentShader: color_grad,
                transparent: true,
                uniforms: {
                    density: {
                        value: this.simulation.fbos.density_0.texture
                    },
                    boundarySpace: {
                        value: new THREE.Vector2()
                    }
                },
            })
        );

        this.scene.add(this.output);
    }
    addScene(mesh){
        this.scene.add(mesh);
    }

    resize() {
        if (this._destroyed) return; // 이미 해제되었다면 실행 중지
        this.simulation.resize();
    }

    render() {
        if (this._destroyed) return; // 이미 해제되었다면 실행 중지
        Common.renderer.setRenderTarget(null);
        Common.renderer.render(this.scene, this.camera);
    }

    update() {
        if (this._destroyed) return; // 이미 해제되었다면 실행 중지
        this.simulation.update();
        this.render();
    }
    destroy() {
        // 중복 호출 방지
        if (this._destroyed) {
            console.warn("Output이 이미 destroy되었습니다.");
            return;
        }
        console.log("Destroying Output...");
        
        try {
            // 1. 시뮬레이션 리소스 연쇄 정리 (가장 중요)
            if (this.simulation && this.simulation.destroy) {
                this.simulation.destroy();
            }

            // 2. Output의 Three.js 리소스(최종 화면 메쉬) 정리
            if (this.output) {
                if (this.output.geometry) this.output.geometry.dispose();
                if (this.output.material) this.output.material.dispose();
                if (this.scene) this.scene.remove(this.output);
            }
        } catch (e) {
            console.error("Output 리소스 해제 중 오류 발생:", e);
        } finally {
            // 3. 참조 해제
            this.simulation = null;
            this.output = null;
            this.scene = null;
            this.camera = null; // camera 참조도 해제
            this._destroyed = true;
        }
    }
}