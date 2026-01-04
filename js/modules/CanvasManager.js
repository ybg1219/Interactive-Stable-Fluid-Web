import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30],
  [29, 31], [30, 32], [27, 31], [28, 32]
];
// import {   PoseLandmarker } from "@mediapipe/tasks-vision";


class CanvasManager {
    constructor() {
        this.drawingUtils = null;
        this.drawingUtils = null;
    }
    init ($wrapper, width, height) {
        $wrapper.style.position = 'relative';

        // VideoManager.init($wrapper, width, height);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawingUtils = new DrawingUtils(this.ctx);

        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0%';
        this.canvas.style.transform = 'translateX(10%) translateY(50%)';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '9';
        this.canvas.style.objectFit = 'cover'

        this.setSize(width, height);
        $wrapper.appendChild(this.canvas);
        // console.log("POSE_CONNECTIONS", PoseLandmarker.POSE_CONNECTIONS);
        // this.drawUtils = window.drawUtils; 
        // console.log(this.drawUtils);
    }
    getElement() {
        // 호출 시 
    // const { video, ctx } = VideoManager.getElement();
    // CanvasManager.draw(video, landmarks)
    // CanvasManager.draw(video, landmarks)
        return { ctx: this.ctx };
    }

    setSize(width, height) {
        const scaler = 0.2;

        // 실제 캔버스 해상도 (픽셀 단위)
        this.canvas.width = width * scaler;
        this.canvas.height = height * scaler;

        // 화면에 표시될 CSS 크기 (같은 비율로 줄여야 실제 크기 줄어듦)
        this.canvas.style.width = `${width * scaler}px`;
        this.canvas.style.height = `${height * scaler}px`;
    }

    drawVideo(video){
        this.ctx.save(); // push() pop() 역할
        this.ctx.scale(-1, 1);  // 좌우 반전
        const canvasRatio = this.canvas.width / this.canvas.height;
        const videoRatio = video.videoWidth / video.videoHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoRatio > canvasRatio) {
            // 비디오가 캔버스보다 가로로 더 길쭉한 경우 (가로가 잘림)
            drawHeight = this.canvas.height;
            drawWidth = drawHeight * videoRatio;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // 비디오가 캔버스보다 세로로 더 길쭉한 경우 (세로가 잘림)
            drawWidth = this.canvas.width;
            drawHeight = drawWidth / videoRatio;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        }        
        // 계산된 크기와 위치로 비디오를 그립니다.
        this.ctx.drawImage(video, -(offsetX + drawWidth), offsetY, drawWidth, drawHeight);

        this.ctx.restore();
    }

    drawLine(video, allLandmarks = []) { 
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawVideo(video);

        // 좌우 반전
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.scale(-1, 1);

        if (allLandmarks.length > 0) {
            allLandmarks.forEach((personLandmarks, idx) => {
                // 색상 & 라벨
                const color = this.getColorForPerson(idx);
                const label = `Person ${idx + 1}`; // 필요하면 이름 배열로 대체 가능

                // PoseLandmarker에서 공식 POSE_CONNECTIONS를 가져와 사용합니다.
                this.drawingUtils.drawConnectors(
                    personLandmarks, 
                    PoseLandmarker.POSE_CONNECTIONS, 
                    { color, lineWidth: 2 }
                );

                this.drawingUtils.drawLandmarks(
                    personLandmarks, 
                    { radius: 3, color }
                );

                // 바운딩 박스 + 라벨 그리기
                this.drawBox(personLandmarks, color, label);
            });
        }

        this.ctx.restore();
    }

    // 사람별 랜덤 색상 생성
    getColorForPerson(idx) {
        const colors = ["lime", "cyan", "yellow", "magenta", "orange"];
        return colors[idx % colors.length];
    }

    // 바운딩 박스 + 라벨
    drawBox(personLandmarks, color = "lime", label = "") {
        if (!personLandmarks || personLandmarks.length === 0) return;

        // [오류 수정] 유사 배열 객체를 진짜 배열로 변환하여 .map()을 안전하게 사용합니다.
        const landmarksArray = Array.from(personLandmarks);

        const xs = landmarksArray.map(p => p.x * this.canvas.width);
        const ys = landmarksArray.map(p => p.y * this.canvas.height);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys) - 100.0;
        const maxY = Math.max(...ys) + 100.0;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

        // 라벨 배경
        this.ctx.fillStyle = color;
        this.ctx.fillRect(minX, minY - 20, this.ctx.measureText(label).width + 10, 20);

        // 라벨 텍스트
        this.ctx.fillStyle = "black";
        this.ctx.font = "14px Arial";
        this.ctx.fillText(label, minX + 5, minY - 5);
    }
}

export default new CanvasManager(); // instance return single ton