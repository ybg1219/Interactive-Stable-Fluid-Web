class VideoManager {
    constructor() {
        this.video = null;
        this.stream = null;
    }

    /**
     * 비디오 엘리먼트를 생성하고 DOM에 추가합니다.
     * @param {HTMLElement} $wrapper - 비디오를 추가할 부모 컨테이너
     * @param {number} width - 비디오 너비
     * @param {number} height - 비디오 높이
     */
    init($wrapper, width, height) {

        this.video = document.createElement('video');
        this.video.id = 'input_video';

        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.style.position = 'absolute';
        this.video.style.top = '0';
        this.video.style.left = '0';
        this.video.style.zIndex = '0';
        this.video.style.opacity = '0.001'; 
        this.video.style.transform = 'scaleX(-1)';
        this.video.style.pointerEvents = 'none';
        this.setSize(width, height);
        $wrapper.appendChild(this.video);
    }

    setVideoOpacity(opacity) {
        if (this.video) {
            this.video.style.opacity = opacity.toString();
        }
    }

    /**
     * 비디오 엘리먼트의 크기를 조절합니다.
     */
    setSize(width, height) {
        if (!this.video) return;
        this.video.width = width;
        this.video.height = height;
        this.video.style.width = `${width}px`;
        this.video.style.height = `${height}px`;
    }

    /**
     * 카메라 권한(getUserMedia)을 요청하고 비디오 스트림을 시작합니다.
     * @throws {Error} 사용자가 권한을 거부할 경우 에러 발생
     */
    async startCamera() {
        try {
            // this.width와 this.height 값의 절반을 해상도로 설정합니다.
            const targetWidth = Math.floor(this.video.width / 2);
            const targetHeight = Math.floor(this.video.height / 2);

            const constraints = {
                video: {
                    width: { ideal: targetWidth },
                    height: { ideal: targetHeight }
                }
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints); // 사용자에게 권한 요청
            this.video.srcObject = this.stream;
        } catch (err) {
            console.error('웹캠 접근 실패:', err);
            throw err; // 에러를 상위로 전파하여 LandingPage에서 catch하도록 함
        }
    }

    /**
     * (디버그용) 로컬 비디오 파일을 로드합니다.
     */
    async loadVideoFile(filePath) {
        try {
            this.video.src = filePath;
            this.video.loop = true;
            this.video.autoplay = true;
            this.video.muted = true;
        await this.video.play();
        } catch (err) {
            console.error(filePath, '동영상 접근 실패:', err);
            throw err; // 에러를 상위로 전파하여 LandingPage에서 catch하도록 함
        }
    }

    /**
     * 비디오 DOM 엘리먼트를 반환합니다.
     * @returns {HTMLVideoElement}
     */
    getElement() {
        return this.video;
    }

    /**
     * 스트림을 중지하고 비디오 엘리먼트를 DOM에서 제거합니다.
     */
    destroy() {
        console.log("Destroying VideoManager...");

        // 1. 카메라 스트림(MediaStream) 중지
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // 2. 비디오 요소 정리
        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
            this.video.src = "";

            // 3. DOM에서 요소 제거
            if (this.video.parentNode) {
                this.video.parentNode.removeChild(this.video);
            }
            this.video = null;
        }
    }
}

export default new VideoManager(); // instance return single ton
