import * as THREE from "three";
import Common from "./Common";

class Tracking {
    constructor() {
        this.handLandmarker = null;
        this.poseLandmarker = null;
        this.landmarks = [];
        this.video = null;

        this.bodyKeys = [
            "head", "leftHand", "rightHand", "center",
            "leftShoulder", "rightShoulder", "leftHeap", "rightHeap", "leftFoot", "rightFoot",
            "leftElbow", "rightElbow", "leftKnee", "rightKnee"
        ];
        this.people = [];
        this.running = false;

        // Web Worker 관련 속성
        this.worker = null;
        this.isWorkerBusy = false;
        this.isWorkerReady = false;
        
        // FPS 제한 설정 (60fps)
        this.fpsInterval = 1000 / 30;
        this.lastFrameTime = 0;

        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
        // Worker 재시작 관련
        this.workerRestartAttempts = 0;
        this.maxWorkerRestartAttempts = 3;
    }

    /**
     * 신체 부위 하나의 데이터 구조를 생성합니다.
     */
    createPartData() {
        return {
            coords: new THREE.Vector2(),
            coords_old: new THREE.Vector2(),
            diff: new THREE.Vector2(),
            timer: null,
            moved: false
        };
    }

    /**
     * 한 사람(person)의 전체 신체 데이터 구조를 생성합니다.
     */
    createPersonData() {
        const person = {};
        this.bodyKeys.forEach(key => {
            person[key] = this.createPartData();
        });
        return person;
    }

    /**
     * MediaPipe 대신 Web Worker를 생성합니다.
     */
    async init(video) {
        this.running = false;
        this.video = video;

        // 기존 Worker가 있다면 종료
        if (this.worker) {
            this.worker.terminate();
        }

        // ✅ 비디오 메타데이터 로드 대기
        await this.waitForVideoReady();

        // Web Worker 생성 (ES Module 지원)
        this.worker = new Worker(new URL('tracking.worker.js', import.meta.url), {
            type: 'module'
        });
        // Worker 메시지 핸들러
        this.worker.onmessage = (event) => {
            const { type, payload } = event.data;

            if (type === 'READY') {
                console.log("Main: Worker is ready.");
                this.isWorkerReady = true;
                this.workerRestartAttempts = 0;
                this.startTracking();
            } else if (type === 'RESULT') {
                const poseResult = payload;
                if (poseResult) {
                    this.handlePoseResult(poseResult);
                }
                this.isWorkerBusy = false;
            } else if (type === 'ERROR') {
                console.error('Worker reported:', event.data.payload.message, event.data.payload.stack);
                this.isWorkerBusy = false;
                
                // 심각한 에러 발생 시 Worker 재시작 시도
                this.handleWorkerError();
            }
        };

        this.worker.onerror = (err) => {
            console.error("Worker error:", err);
            this.isWorkerBusy = false;
            this.handleWorkerError();
        };

        // ✅ 비디오 크기 검증 후 OffscreenCanvas 생성
        const scale = 0.3; // 해상도 조정 비율
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
            console.error("Video dimensions are invalid:", videoWidth, videoHeight);
            throw new Error("Video not ready: invalid dimensions");
        }
        
        // ✅ 캔버스 크기 저장 (createImageBitmap에서 사용)
        this.canvasWidth = Math.floor(videoWidth * scale);
        this.canvasHeight = Math.floor(videoHeight * scale);
        
        console.log(`Initializing: Video ${videoWidth}x${videoHeight} → Canvas ${this.canvasWidth}x${this.canvasHeight}`);
        
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = videoWidth * scale;
        offscreenCanvas.height = videoHeight * scale;

        const transferableCanvas = offscreenCanvas.transferControlToOffscreen();

        // GH Pages 배포를 위한 경로 설정
        // const basePath = import.meta.env?.BASE_URL || './';
        
        this.worker.postMessage({
            type: 'INIT',
            canvas: transferableCanvas,
            wasmPath: `./mediapipe/wasm`,
            modelPath: `./mediapipe/models/pose_landmarker_lite.task`
        }, [transferableCanvas]);
    }

    /**
     * ✅ 추가: 비디오 메타데이터 로드 대기
     */
    async waitForVideoReady() {
        return new Promise((resolve, reject) => {
            // 이미 준비되었으면 즉시 반환
            if (this.video.readyState >= 2) {
                resolve();
                return;
            }

            // 타임아웃 설정 (5초)
            const timeout = setTimeout(() => {
                this.video.removeEventListener('loadedmetadata', onLoaded);
                reject(new Error("Video failed to load metadata within 5 seconds"));
            }, 5000);

            const onLoaded = () => {
                clearTimeout(timeout);
                // 추가 안전 체크: videoWidth/Height가 실제로 0이 아닌지 확인
                if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                    resolve();
                } else {
                    // 한번 더 기다려보기
                    setTimeout(() => {
                        if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                            resolve();
                        } else {
                            reject(new Error("Video dimensions are still 0 after loadedmetadata"));
                        }
                    }, 100);
                }
            };

            this.video.addEventListener('loadedmetadata', onLoaded, { once: true });
        });
    }

    /**
     * ✅ 추가: Worker 에러 처리 및 재시작 로직
     */
    handleWorkerError() {
        if (this.workerRestartAttempts >= this.maxWorkerRestartAttempts) {
            console.error("Worker failed to restart after multiple attempts. Tracking stopped.");
            this.stopTracking();
            return;
        }
        
        console.warn(`Attempting to restart worker (attempt ${this.workerRestartAttempts + 1}/${this.maxWorkerRestartAttempts})`);
        this.workerRestartAttempts++;
        this.isWorkerReady = false;
        
        // 기존 Worker 종료 및 재시작
        if (this.worker) {
            this.worker.terminate();
        }
        
        // 100ms 후 재시작
        setTimeout(() => {
            this.init(this.video);
        }, 100);
    }

    startTracking() {
        if (this.running) return;
        this.running = true;

        // 루프 시작 시점의 시간을 기록
        this.lastFrameTime = performance.now();

        // 첫 프레임 요청
        requestAnimationFrame(this.process);
    }

    /**
     * 매 프레임 실행되는 메인 루프 (60fps로 제한)
     */
    process = async (timestamp) => {
        if (!this.running) return;

        // 다음 프레임을 즉시 요청 (루프 유지)
        requestAnimationFrame(this.process);

        // FPS 제한 로직
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.fpsInterval) {
            return;
        }

        this.lastFrameTime = timestamp - (elapsed % this.fpsInterval);

        // ✅ 추가: Worker 준비 상태 체크
        if (!this.isWorkerReady) {
            return;
        }

        // Worker가 이전 프레임을 처리 중이면 건너뛰기
        if (this.isWorkerBusy) {
            return;
        }

        try {
            this.isWorkerBusy = true;

            // 비디오에서 ImageBitmap 생성
            const imageBitmap = await createImageBitmap(this.video, {
                resizeWidth: this.canvasWidth,
                resizeHeight: this.canvasHeight,
                resizeQuality: 'low'
            });

            // Worker에게 ImageBitmap과 타임스탬프 전송 (소유권 이전)
            this.worker.postMessage({
                type: 'DETECT',
                frame: imageBitmap,
                timestamp: timestamp
            }, [imageBitmap]);

        } catch (err) {
            console.error("Error in main thread process loop:", err);
            this.isWorkerBusy = false;
        }
    }

    /**
     * 감지된 포즈 결과를 처리하여 각 사람의 데이터를 업데이트합니다.
     */
    handlePoseResult(poseResult) {
        if (!poseResult.landmarks || poseResult.landmarks.length === 0) {
            this.people = [];
            this.landmarks = [];
            return;
        }
        this.landmarks = poseResult.landmarks;

        // 감지된 사람 수만큼 순회
        this.people = poseResult.landmarks.map((personLandmarks, personIndex) => {
            const personData = this.people[personIndex] || this.createPersonData();

            if (!personLandmarks || personLandmarks.length < 33) return personData;

            // 주요 랜드마크 추출
            const head = personLandmarks[0];
            const leftHand = personLandmarks[15];
            const rightHand = personLandmarks[16];
            const leftShoulder = personLandmarks[11];
            const rightShoulder = personLandmarks[12];
            const leftHeap = personLandmarks[23];
            const rightHeap = personLandmarks[24];
            const leftFoot = personLandmarks[29];
            const rightFoot = personLandmarks[30];

            // 중간 지점 계산
            const neckX = (leftShoulder.x + rightShoulder.x) / 2;
            const neckY = (leftShoulder.y + rightShoulder.y) / 2;
            const heapX = (leftHeap.x + rightHeap.x) / 2;
            const heapY = (leftHeap.y + rightHeap.y) / 2;

            const leftElbow = personLandmarks[13];
            const rightElbow = personLandmarks[14];
            const leftKnee = personLandmarks[25];
            const rightKnee = personLandmarks[26];

            // 각 신체 부위 좌표 업데이트
            this.updatePartCoords(personData.head, head.x, head.y);
            this.updatePartCoords(personData.leftHand, leftHand.x, leftHand.y);
            this.updatePartCoords(personData.rightHand, rightHand.x, rightHand.y);
            this.updatePartCoords(personData.leftShoulder, leftShoulder.x, leftShoulder.y);
            this.updatePartCoords(personData.rightShoulder, rightShoulder.x, rightShoulder.y);
            this.updatePartCoords(personData.center, neckX, neckY);
            this.updatePartCoords(personData.leftHeap, leftHeap.x, leftHeap.y);
            this.updatePartCoords(personData.rightHeap, rightHeap.x, rightHeap.y);
            this.updatePartCoords(personData.leftFoot, leftFoot.x, leftFoot.y);
            this.updatePartCoords(personData.rightFoot, rightFoot.x, rightFoot.y);
            this.updatePartCoords(personData.leftElbow, leftElbow.x, leftElbow.y);
            this.updatePartCoords(personData.rightElbow, rightElbow.x, rightElbow.y);
            this.updatePartCoords(personData.leftKnee, leftKnee.x, leftKnee.y);
            this.updatePartCoords(personData.rightKnee, rightKnee.x, rightKnee.y);

            return personData;
        });
    }

    /**
     * 특정 신체 부위의 좌표와 움직임 상태를 업데이트합니다.
     */
    updatePartCoords(partData, x, y) {
        if (!partData) return;

        // 타이머가 있다면 초기화
        if (partData.timer) clearTimeout(partData.timer);

        partData.coords.set((1 - x) * 2 - 1, -(y * 2 - 1));
        partData.moved = true;

        // 100ms 후 움직임 상태를 false로 변경
        partData.timer = setTimeout(() => {
            partData.moved = false;
        }, 100);
    }

    /**
     * 매 프레임마다 호출되어 각 신체 부위의 좌표 변화량을 계산합니다.
     */
    update() {
        this.people.forEach(person => {
            this.bodyKeys.forEach(key => {
                const part = person[key];
                part.diff.subVectors(part.coords, part.coords_old);
                part.coords_old.copy(part.coords);

                // 첫 프레임에서 diff 값이 비정상적으로 커지는 것을 방지
                if (part.coords_old.lengthSq() === 0) {
                    part.diff.set(0, 0);
                }
            });
        });
    }

    /**
     * 추적을 중지합니다.
     */
    stopTracking() {
        this.running = false;
    }

    /**
     * 추적된 모든 사람의 데이터를 반환합니다.
     */
    getPeople() {
        return this.people;
    }

    getLandmarks() {
        if (!this.landmarks || !Array.isArray(this.landmarks)) {
            return [];
        }
        return this.landmarks;
    }

    /**
     * MediaPipe 인스턴스와 추적 루프를 안전하게 종료합니다.
     */
    destroy() {
        console.log("Destroying Tracking...");
        
        // requestAnimationFrame 루프를 중단시킵니다.
        this.running = false;

        // Worker 종료
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        // MediaPipe PoseLandmarker 인스턴스의 리소스를 해제합니다.
        if (this.poseLandmarker) {
            this.poseLandmarker.close();
            this.poseLandmarker = null;
        }

        // 데이터 배열을 초기화합니다.
        this.people = [];
        this.landmarks = [];
        
        // 상태 플래그 초기화
        this.isWorkerBusy = false;
        this.isWorkerReady = false;
        this.workerRestartAttempts = 0;
    }
}

export default new Tracking();