import Common from "./Common";
import Output from "./Output";
import Mouse from "./Mouse";
import Tracking from "./Tracking";
import VideoManager from "./VideoManager";
import CanvasManager from "./CanvasManager";

export default class Webgl {
    constructor(props) {
        this.props = props; // document.body를 받아옴.
        this._destroyed = false;
        this.animationFrameId = null;

        // 1. 옵션 및 매니저 초기화
        this.setupOptions();
        this.initManagers();

        // 2. 이벤트 바인딩
        this.bindEvents();

        // 3. 비동기 초기화 시작
        this.init().then(() => {
            if (!this._destroyed) {
                this.loop();
            }
        });
    }

    /**
     * 시뮬레이션 옵션 설정
     */
    setupOptions() {
        this.options = {
            isMultiPerson: true, // 이 값을 false로 바꾸면 단일 모드로 실행됩니다.
        };
    }

    /**
     * 공통 렌더러 및 비디오/캔버스 매니저 초기화
     */
    initManagers() {
        // 공통 렌더러 요소들 초기화
        Common.init();

        // 비디오와 캔버스 매니저 초기화
        VideoManager.init(this.props.$wrapper, Common.width, Common.height);
        CanvasManager.init(this.props.$wrapper, Common.width, Common.height);
    }

    /**
     * 이벤트 리스너 등록
     */
    bindEvents() {
        // 이벤트 리스너 제거를 위해 bind된 함수를 변수에 저장
        this.resizeHandler = this.resize.bind(this);
        window.addEventListener("resize", this.resizeHandler);
    }

    /**
     * 메인 비동기 초기화 함수
     */
    async init() {
        this.setupDOM();
        await this.setupVideo();
        
        Mouse.init();
        
        await this.setupTracker();
        this.setupOutput();
    }

    /**
     * DOM 요소(Canvas, Stats) 추가
     */
    setupDOM() {
        // 렌더러 Canvas를 Wrapper 맨 앞에 추가 (prepend)
        this.props.$wrapper.prepend(Common.renderer.domElement);

        // FPS 확인용 Stats 추가
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        console.log("PUBLIC_URL:", process.env.PUBLIC_URL);
    }

    /**
     * 비디오 리소스 로드
     */
    async setupVideo() {
        // [중요] 실제 서비스 시에는 startCamera를 사용해야 합니다.
        // await VideoManager.startCamera(); 
        
        const videoPath = `${process.env.PUBLIC_URL}videos/image.mp4`;
        await VideoManager.loadVideoFile(videoPath);
    }

    /**
     * 트래커 설정 및 초기화
     */
    async setupTracker() {
        // 옵션에 따라 적절한 트래커 할당
        if (this.options.isMultiPerson) {
            console.log("Initializing Multi-person Tracker");
            this.activeTracker = Tracking;
        } else {
            // BodyTracking 모듈이 있다면 사용 (현재는 Fallback)
            // console.log("Initializing Single-person Tracker");
            // this.activeTracker = BodyTracking;
            this.activeTracker = Tracking; 
        }

        // 트래커 초기화
        await this.activeTracker.init(VideoManager.getElement());
    }

    /**
     * 시뮬레이션 출력(Output) 설정
     */
    setupOutput() {
        this.output = new Output({
            activeTracker: this.activeTracker,
            options: this.options
        });
    }

    /**
     * 리사이즈 처리
     */
    resize() {
        if (this._destroyed) return;

        Common.resize();
        if (this.output) this.output.resize();

        VideoManager.setSize(Common.width, Common.height);
        CanvasManager.setSize(Common.width, Common.height);
    }

    /**
     * 렌더링 로직
     */
    render() {
        if (this._destroyed) return;

        Mouse.update();

        // 활성화된 트래커 업데이트
        if (this.activeTracker) {
            this.activeTracker.update();
        }

        Common.update();
        this.output.update();

        // 랜드마크 디버그 드로잉
        const landmarks = this.activeTracker ? (this.activeTracker.getLandmarks ? this.activeTracker.getLandmarks() : this.activeTracker.landmarks) : [];
        if (landmarks && landmarks.length > 0) {
            CanvasManager.drawLine(VideoManager.getElement(), landmarks);
        }
    }

    /**
     * 애니메이션 루프
     */
    loop() {
        if (this._destroyed) return;

        if (this.stats) this.stats.begin();
        this.render();
        if (this.stats) this.stats.end();
        this.animationFrameId = requestAnimationFrame(this.loop.bind(this)); 
    }

    /**
     * WebGL 인스턴스의 모든 리소스를 정리하는 함수
     */
    destroy() {
        // 중복 호출 방지
        if (this._destroyed) {
            console.warn("WebGL이 이미 destroy되었습니다.");
            return;
        }
        console.log("WebGL 인스턴스를 정리합니다...");

        try {
            // 1. 애니메이션 루프 중단
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            // 2. 이벤트 리스너 제거
            window.removeEventListener("resize", this.resizeHandler);

            // 3. Stats.js DOM 요소 제거
            if (this.stats && this.stats.dom.parentNode) {
                this.stats.dom.parentNode.removeChild(this.stats.dom);
            }

            // 4. Output (Simulation) 연쇄 정리
            if (this.output && this.output.destroy) {
                this.output.destroy();
            }

            // 5. VideoManager 정리
            VideoManager.destroy();

            // 6. Tracker 정리
            if (this.activeTracker && this.activeTracker.destroy) {
                this.activeTracker.destroy();
            }

            // 7. 렌더러 DOM 요소 제거
            if (Common.renderer.domElement.parentNode) {
                Common.renderer.domElement.parentNode.removeChild(Common.renderer.domElement);
            }

        } catch (e) {
            console.error("WebGL 리소스 해제 중 오류 발생:", e);
        } finally {
            // 8. 참조 해제
            this.output = null;
            this.activeTracker = null;
            this.stats = null;
            this.props = null; // $wrapper 참조 해제
            this._destroyed = true;
        }
    }
}