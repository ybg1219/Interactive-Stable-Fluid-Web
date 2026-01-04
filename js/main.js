import WebGL from './modules/WebGL.js';
import VideoManager from './modules/VideoManager.js'; // 웹캠 제어를 위해 import

// 개발 환경 플래그 설정
if (!window.isDev) window.isDev = false;

/**
 * 메인 실행 로직
 */
(function main() {
    setupBodyStyles();
    initWebGL();
    createWebcamToggleUI();
    setupWebcamToggleEvent();
})();

/**
 * 1. Body 기본 스타일 설정
 * 전체 화면, 배경색, 오버플로우 숨김 등을 설정합니다.
 */
function setupBodyStyles() {
    document.body.classList.add('relative', 'w-full', 'h-full', 'overflow-hidden', 'bg-stone-100', 'm-0', 'p-0');
}

/**
 * 2. WebGL 인스턴스 생성
 * Canvas가 document.body에 추가됩니다.
 */
function initWebGL() {
    new WebGL({
        $wrapper: document.body
    });
}

/**
 * 3. 웹캠 토글 UI 생성 및 DOM 추가
 */
function createWebcamToggleUI() {
    const uiContainer = document.createElement('div');
    // UI 컨테이너는 클릭 이벤트를 통과시키도록 설정 (pointer-events-none)
    uiContainer.className = "absolute inset-0 z-50 pointer-events-none";

    uiContainer.innerHTML = `
        <!-- 버튼 패널: 왼쪽 상단 배치 -->
        <div class="absolute bottom-6 left-6 pointer-events-auto font-sans">
            <div class="flex flex-col items-start gap-3 p-5 bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl transition-transform hover:scale-105">
                
                <button id="btn-enable-webcam" class="group relative flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 w-full overflow-hidden">
                    <span class="relative z-10 flex items-center gap-2">
                        <span id="btn-icon">📷</span> 
                        <span id="btn-text">웹캠 배경 켜기</span>
                    </span>
                    <!-- 호버 시 빛나는 효과 -->
                    <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                
                <div class="flex items-start gap-2 px-1">
                    <span class="text-yellow-400 text-sm mt-0.5 animate-bounce">💡</span>
                    <p class="text-indigo-100 text-xs font-medium leading-relaxed opacity-90">
                        증강 현실 효과를 위해<br/>
                        <span class="text-white border-b border-white/20 pb-0.5">웹캠 배경</span>을 켜보세요!
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(uiContainer);
}

/**
 * 4. 버튼 이벤트 핸들러 설정
 * 웹캠 배경 활성화/비활성화 기능을 연결합니다.
 */
function setupWebcamToggleEvent() {
    const btnToggle = document.getElementById('btn-enable-webcam');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    
    let isWebcamVisible = false; // 현재 웹캠 상태 추적

    if (!btnToggle) return;

    btnToggle.addEventListener('click', () => {
        // VideoManager에서 비디오 엘리먼트 가져오기
        const video = VideoManager.getElement();
        
        if (video) {
            isWebcamVisible = !isWebcamVisible;
            
            // 비디오 투명도 조절로 토글 (0: 안보임, 1: 보임)
            // (WebGL 배경이 투명해야 웹캠이 보입니다. WebGL 생성 시 alpha: true 확인 필요)
            video.style.opacity = isWebcamVisible ? '0.3' : '0';
            
            // 버튼 UI 업데이트
            updateToggleButtonUI(isWebcamVisible, btnText, btnIcon, btnToggle);
        } else {
            console.warn("웹캠 비디오 요소를 찾을 수 없습니다. (권한 허용 필요)");
            alert("카메라가 준비되지 않았습니다. 잠시 후 다시 시도하거나 브라우저 권한을 확인해주세요.");
        }
    });
}

/**
 * 토글 버튼의 텍스트와 스타일을 상태에 따라 업데이트합니다.
 */
function updateToggleButtonUI(isVisible, textEl, iconEl, btnEl) {
    if (isVisible) {
        textEl.innerText = "웹캠 배경 끄기";
        iconEl.innerText = "🚫";
        btnEl.classList.replace('bg-indigo-600', 'bg-rose-600');
        btnEl.classList.replace('hover:bg-indigo-500', 'hover:bg-rose-500');
    } else {
        textEl.innerText = "웹캠 배경 켜기";
        iconEl.innerText = "📷";
        btnEl.classList.replace('bg-rose-600', 'bg-indigo-600');
        btnEl.classList.replace('hover:bg-rose-500', 'hover:bg-indigo-500');
    }
}