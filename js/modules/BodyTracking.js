import * as THREE from "three";
import Common from "./Common";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

class BodyTracking {

    constructor() {
        this.landmarks = [];
        this.videoElement = null;
        this.pose = null;
        this.running = false; // 루프 제어를 위한 플래그

        this.people = [];
        this.bodyKeys = [
            "head", "leftHand", "rightHand", "center",
            "leftShoulder", "rightShoulder", "leftHeap", "rightHeap", "leftFoot", "rightFoot",
            "leftElbow", "rightElbow", "leftKnee", "rightKnee"
        ];
    }


    /**
     * 한 사람(person)의 전체 신체 데이터 구조를 생성합니다.
     * @returns {Object.<string, {coords: THREE.Vector2, coords_old: THREE.Vector2, diff: THREE.Vector2, timer: number, moved: boolean}>}
     */
    createPersonData() {
        const person = {};
        this.bodyKeys.forEach(key => { person[key] = this.createPartData(); });
        return person;
    }

    /**
     * 신체 부위 하나의 데이터 구조를 생성합니다.
     * @returns {{coords: THREE.Vector2, coords_old: THREE.Vector2, diff: THREE.Vector2, timer: number, moved: boolean}}
     */
    createPartData() {
        return {
            coords: new THREE.Vector2(),
            coords_old: new THREE.Vector2(),
            diff: new THREE.Vector2(),
            moved: false,
            timer: null
        }
    }

    async init(video) {
        if (this.running) return; // 중복 실행 방지
        this.running = true;

        this.videoElement = video;

        // 재초기화 시 이전 인스턴스가 있다면 안전하게 정리합니다.
        if (this.pose) {
            this.pose.close();
        }

        this.pose = new Pose({
            locateFile: (file) => {
                return `/mediapipe/pose/${file}`; // 나중에 webpack이 복사해줄 경로
            }
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });


        this.pose.onResults(results => this.handlePoseResult(results));

        await this.cameraStart();

        console.log("Pose Tracking initialized");
    }

    /**
     * MediaPipe 결과를 this.people 배열에 업데이트합니다.
     */
    handlePoseResult(results) {
        if (!this.running) return; // 중복 실행 방지
        this.landmarks = [results.poseLandmarks];
        if (results.poseLandmarks) {
            if (this.people.length === 0) {
                this.people.push(this.createPersonData());
            }

            const personData = this.people[0];
            const landmarks = results.poseLandmarks;

            const neck = { x: (landmarks[11].x + landmarks[12].x) / 2, y: (landmarks[11].y + landmarks[12].y) / 2 };
            const heap = { x: (landmarks[23].x + landmarks[24].x) / 2, y: (landmarks[23].y + landmarks[24].y) / 2 };

            this.updatePartCoords(personData.head, landmarks[0].x, landmarks[0].y);
            this.updatePartCoords(personData.leftHand, landmarks[15].x, landmarks[15].y);
            this.updatePartCoords(personData.rightHand, landmarks[16].x, landmarks[16].y);
            this.updatePartCoords(personData.leftShoulder, landmarks[11].x, landmarks[11].y);
            this.updatePartCoords(personData.rightShoulder, landmarks[12].x, landmarks[12].y);
            this.updatePartCoords(personData.center, neck.x, neck.y);
            // this.updatePartCoords(personData.heap, heap.x, heap.y);
            this.updatePartCoords(personData.leftFoot, landmarks[29].x, landmarks[29].y);
            this.updatePartCoords(personData.rightFoot, landmarks[30].x, landmarks[30].y);
            this.updatePartCoords(personData.leftHeap, landmarks[23].x, landmarks[23].y);
            this.updatePartCoords(personData.rightHeap, landmarks[24].x, landmarks[24].y);
            this.updatePartCoords(personData.leftElbow, landmarks[13].x, landmarks[13].y);
            this.updatePartCoords(personData.rightElbow, landmarks[14].x, landmarks[14].y);
            this.updatePartCoords(personData.leftKnee, landmarks[25].x, landmarks[25].y);
            this.updatePartCoords(personData.rightKnee, landmarks[26].x, landmarks[26].y);
        } else {
            this.people = [];
            this.landmarks = []; // 이 부분이 누락되어 있었습니다.
        }
    }


    async cameraStart() {

        // 비디오 메타데이터가 로드되어야 videoWidth/Height를 알 수 있습니다.
        if (this.videoElement.readyState < 1) { // readyState < 1: HAVE_NOTHING
            await new Promise(resolve => {
                // 아직 로드되지 않았다면 리스너를 등록하고 기다림
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.onloadedmetadata = null; // 리스너 제거
                    resolve();
                };
            });
        }

        // 비디오가 재생되면 매 프레임 추적을 시작합니다.
        const process = async () => {
            // this.running 플래그가 false가 되면 루프가 멈춥니다.
            if (!this.running) return;

            await this.pose.send({ image: this.videoElement });
            // console.log("Processing Frame..."); // ⬅️ 이 로그가 찍히는지 확인
            requestAnimationFrame(process);
        };

        process();
    }

    /**
     * 특정 신체 부위의 좌표와 움직임 상태를 업데이트합니다.
     * @param {Object} partData - 업데이트할 신체 부위 데이터 객체 (예: personData.head)
     * @param {number} x - 랜드마크의 x 좌표 (0.0 ~ 1.0)
     * @param {number} y - 랜드마크의 y 좌표 (0.0 ~ 1.0)
     */
    updatePartCoords(partData, x, y) {
        if (!partData) return;

        // 타이머가 있다면 초기화
        if (partData.timer) clearTimeout(partData.timer);

        const screenX = Math.floor((1 - x) * Common.width);
        const screenY = Math.floor(y * Common.height);

        // WebGL 좌표계(-1.0 ~ 1.0)로 변환하여 저장
        partData.coords.set((screenX / Common.width) * 2 - 1, -(screenY / Common.height) * 2 + 1);
        partData.moved = true;

        // 100ms 후 움직임 상태를 false로 변경
        partData.timer = setTimeout(() => {
            partData.moved = false;
        }, 100);
    }

    update() {
        if (this.people.length === 0) return;
        const person = this.people[0];
        for (const key of this.bodyKeys) {
            const part = person[key];
            if (part) {
                if (part.coords_old.lengthSq() === 0) {
                    part.coords_old.copy(part.coords);
                }
                part.diff.subVectors(part.coords, part.coords_old);
                part.moved = part.diff.length() > 0.01;
                part.coords_old.copy(part.coords);
            }
        }
    }

    /**
     * 추적된 모든 사람의 데이터를 반환합니다.
     * @returns {Array<Object>}
     */
    getPeople() {
        return this.people;
    }

    getLandmarks() {
        // landmarks가 정의되지 않았으면 빈 배열 반환
        if (!this.landmarks || !Array.isArray(this.landmarks)) {
            return [];
        }
        return this.landmarks;
    }

    /**
     * MediaPipe 인스턴스와 추적 루프를 안전하게 종료합니다.
     */
    destroy() {
        console.log("Destroying BodyTracking...");
        // 1. requestAnimationFrame 루프를 중단시킵니다.
        this.running = false;

        // 2. MediaPipe Pose 인스턴스의 리소스를 해제합니다.
        if (this.pose) {
            this.pose.close();
            this.pose = null;
        }
        this.people = [];
    }
}

export default new BodyTracking();
