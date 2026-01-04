import face_vert from "./glsl/sim/face.vert";
import density_frag from "./glsl/sim/density.frag";

import ShaderPass from "./ShaderPass";

import * as THREE from "three";
import { BODY_PART_ORDER, MAX_BODY_PARTS, MAX_PEOPLE} from "./Simulation";
// export const MAX_TOTAL_PARTS = MAX_BODY_PARTS * MAX_PEOPLE;
export default class Density extends ShaderPass {
    constructor(simProps) {
        const MAX_TOTAL_PARTS = MAX_BODY_PARTS * MAX_PEOPLE;
        super({
            material: {
                vertexShader: face_vert,
                fragmentShader: `
                    // MAX_BODY_PARTS 정의
                    #define MAX_TOTAL_PARTS ${MAX_TOTAL_PARTS}
                    
                    // 기존 셰이더 코드
                    ${density_frag}
                `,
                uniforms: {
                    // 점 소스를 위한 좌표 배열
                    pointPositions: { value: null },
                    // 선 소스를 위한 좌표 배열
                    linePositions: { value: null },
                    pointCount: { value: 0 },
                    // 유효한 선의 개수
                    lineCount: { value: 0 },
                    radius: {
                        value: 0.0
                    },
                    strength: {
                        value: 0.5
                    },
                    px: {
                        value: simProps.cellScale
                    },
                    dt: {
                        value: simProps.dt
                    },
                    fboSize: {
                        value: simProps.fboSize
                    },
                    numPeople: {
                        value: 1
                    }
                }
            },
            output: simProps.dst,

            output0: simProps.den,
            output1: simProps.dst
        })
        this.landmarkMaxSize = MAX_TOTAL_PARTS;
        this.partsPerPerson = BODY_PART_ORDER.length;
        this.bodyConnectionIndices = [
            // Torso (몸통)
            [BODY_PART_ORDER.indexOf('head'), BODY_PART_ORDER.indexOf('center')],
            [BODY_PART_ORDER.indexOf('center'), BODY_PART_ORDER.indexOf('leftShoulder')],
            [BODY_PART_ORDER.indexOf('center'), BODY_PART_ORDER.indexOf('rightShoulder')],
            [BODY_PART_ORDER.indexOf('leftShoulder'), BODY_PART_ORDER.indexOf('leftHeap')], // 왼쪽 어깨 -> 왼쪽 엉덩이
            [BODY_PART_ORDER.indexOf('rightShoulder'), BODY_PART_ORDER.indexOf('rightHeap')], // 오른쪽 어깨 -> 오른쪽 엉덩이
            [BODY_PART_ORDER.indexOf('leftHeap'), BODY_PART_ORDER.indexOf('rightHeap')], // 엉덩이 연결

            // Left Arm (왼팔) - [어깨 -> 팔꿈치], [팔꿈치 -> 손]
            [BODY_PART_ORDER.indexOf('leftShoulder'), BODY_PART_ORDER.indexOf('leftElbow')],
            [BODY_PART_ORDER.indexOf('leftElbow'), BODY_PART_ORDER.indexOf('leftHand')],

            // Right Arm (오른팔) - [어깨 -> 팔꿈치], [팔꿈치 -> 손]
            [BODY_PART_ORDER.indexOf('rightShoulder'), BODY_PART_ORDER.indexOf('rightElbow')],
            [BODY_PART_ORDER.indexOf('rightElbow'), BODY_PART_ORDER.indexOf('rightHand')],

            // Left Leg (왼다리) - [엉덩이 -> 무릎], [무릎 -> 발]
            [BODY_PART_ORDER.indexOf('leftHeap'), BODY_PART_ORDER.indexOf('leftKnee')],
            [BODY_PART_ORDER.indexOf('leftKnee'), BODY_PART_ORDER.indexOf('leftFoot')],

            // Right Leg (오른다리) - [엉덩이 -> 무릎], [무릎 -> 발]
            [BODY_PART_ORDER.indexOf('rightHeap'), BODY_PART_ORDER.indexOf('rightKnee')],
            [BODY_PART_ORDER.indexOf('rightKnee'), BODY_PART_ORDER.indexOf('rightFoot')],
        ];
        this.init();
    }


    init() {
        super.init();
        
        const MAX_TOTAL_PARTS = MAX_BODY_PARTS * MAX_PEOPLE;
        // 점 좌표 배열 초기화
        this.uniforms.pointPositions.value = new Float32Array(MAX_TOTAL_PARTS * 2);

        // 선 좌표 배열 초기화
        this.uniforms.linePositions.value = new Float32Array(MAX_TOTAL_PARTS * 4); // 선 개수 * 점 2개 * xy 2개
    }

    update({ cursor_size, cellScale, sourcePos, numPeople, isAlone }) {

        this.uniforms.radius.value = cursor_size;
        this.uniforms.px.value = cellScale;

        // 여러 개의 소스 위치를 0~1로 변환해서 각 유니폼에 전달
        const toUv = ({ x, y }) => new THREE.Vector2((x + 1.0) * 0.5, (y + 1.0) * 0.5);

        // 점 소스
        const validPointCoords = [];
        if (isAlone) {
            // console.log(sourcePos)
            if (sourcePos.x <= -1.0 && sourcePos.y <= -1.0) return;
            sourcePos = toUv(sourcePos);
            validPointCoords.push(sourcePos.x, sourcePos.y);
            this.uniforms.pointPositions.value.set(validPointCoords);
            this.uniforms.pointCount.value = 1;
        }else{
            if (sourcePos.length > this.landmarkMaxSize) {
                console.warn("sourcePos overflow: ", sourcePos.length, ">", this.landmarkMaxSize);
            }
            const uvCoords = sourcePos.map(toUv);
            
            
            for (let i = 0; i < uvCoords.length; i++) {
                if (uvCoords[i].x <= -1.0 && uvCoords[i].y <= -1.0) continue;
                validPointCoords.push(uvCoords[i].x, uvCoords[i].y);
            }
            this.uniforms.pointPositions.value.set(validPointCoords);
            this.uniforms.pointCount.value = validPointCoords.length / 2;

            // 선 소스
            // 2-1. 총 몇 명의 데이터가 들어왔는지 계산
            const validLineCoords = [];
            // const numPeople = uvCoords.length / this.partsPerPerson;
            console.log("Number of People:", numPeople);

            // 2-2. 사람 수만큼 루프
            for (let i = 0; i < numPeople; i++) {
                // 2-3. 이 사람의 데이터가 시작되는 "오프셋"
                const personOffset = i * this.partsPerPerson;

                // 2-4. 뼈대 연결 규칙 순회
                this.bodyConnectionIndices.forEach(([indexA, indexB]) => {
                    if (indexA === -1 || indexB === -1) return;

                    // 2-5. [핵심] 오프셋을 더해 실제 인덱스 계산
                    const actualIndexA = personOffset + indexA;
                    const actualIndexB = personOffset + indexB;

                    if (actualIndexA >= uvCoords.length || actualIndexB >= uvCoords.length) return;

                    const partA = uvCoords[actualIndexA];
                    const partB = uvCoords[actualIndexB];

                    if (partA && partB && partA.x >= -1.0 && partB.x >= -1.0) {
                        validLineCoords.push(partA.x, partA.y, partB.x, partB.y);
                    }
                });
            }

            // 유효한 선 데이터를 Float32Array에 복사하고, 유효한 선의 개수를 업데이트합니다.
            this.uniforms.linePositions.value.set(validLineCoords);
            this.uniforms.lineCount.value = validLineCoords.length / 4; // 선 하나당 4개의 float
        }
        super.update();
    }
}