import * as dat from "dat.gui";

export default class Controls {
    constructor(params) {
        this.params = params;
        this.init();
    }

    /**
     * dat.GUI의 기본 스타일을 덮어쓰는 CSS를 <head>에 삽입합니다.
     * (어두운 테마 예시)
     */
    applyCustomStyles() {
        // 이 ID로 스타일 태그가 이미 존재하는지 확인합니다.
        if (document.getElementById('dat-gui-custom-styles')) {
            return;
        }

        const css = `
            /* --- dat.GUI 커스텀 스타일 --- */

            /* 1. 색상 테마 (어두운 테마 예시) */
            .dg.main {
                background-color: #1e40af !important; /* 메인 배경 */
                border: 1px solid #333;
            }

            .dg.main .close-button {
                background-color: #1e40af !important; /* 닫기 버튼 배경 */
            }

            /* GUI가 열렸을 때의 타이틀 바 */
            .dg .cr.title {
                background: #1e40af !important; 
                border-bottom: 1px solid #333;
                color: #eee;
            }
            .dg .cr.title .title-label {
                color: #eee !important;
            }

            /* GUI가 닫혔을 때의 타이틀 바 */
            .dg.main.closed li.title {
                background: #eee !important; 
                color: #1e40af !important;
            }
            
            /* 모든 컨트롤 행 */
            .dg li:not(.folder) {
                background: #eee !important;
                border-bottom: 1px solid #444;
            }

            /* 속성 이름 (텍스트) */
            .dg li .property-name {
                color: #444;
            }

            /* 슬라이더 */
            .dg li .c .slider {
                background: #acacacff;
            }
            .dg li .c .slider .slider-fg {
                background: #0099ff; /* 슬라이더 채움 색상 (포인트 색상) */
            }

            /* 텍스트 입력창 */
            .dg li .c input[type=text] {
                background: #444;
                color: #eee;
            }

            /* 체크박스 */
            .dg li .c input[type=checkbox] + .checkmark {
                background: #444;
            }
            .dg li .c input[type=checkbox]:checked + .checkmark {
                background: #0099ff; /* 체크박스 체크 시 (포인트 색상) */
            }
            
            /* 버튼이나 셀렉트 박스 텍스트 색상 */
            .dg .c select,
            .dg .c .button {
                color: #eee;
                background: #444;
            }
        `;

        // <style> 요소 생성
        const styleElement = document.createElement('style');
        styleElement.type = 'text/css';
        styleElement.id = 'dat-gui-custom-styles'; // 중복 삽입 방지를 위한 ID

        // CSS 규칙 추가
        if (styleElement.styleSheet) {
            // IE
            styleElement.styleSheet.cssText = css;
        } else {
            // Modern browsers
            styleElement.appendChild(document.createTextNode(css));
        }

        // <head>에 스타일 태그 추가
        document.head.appendChild(styleElement);
    }

    init() {
        this.gui = new dat.GUI({ width: 250 });

        // --- 1. 위치 변경 ---
        // dat.GUI의 메인 DOM 요소를 가져옵니다.
        const guiElement = this.gui.domElement;
        
        // CSS를 직접 조작하여 위치를 변경합니다.
        guiElement.style.position = 'fixed'; // 화면에 고정
        
        // 상단에서 50% 위치로 이동
        guiElement.style.top = '30%';       
        // Y축으로 -50% 만큼 이동하여 세로 중앙 정렬
        guiElement.style.transform = 'translateY(0%)'; 
        
        // 왼쪽(left) 속성 해제
        guiElement.style.left = '5%';
        
        // --- 2. 색상 변경 ---
        // 커스텀 스타일(CSS)을 적용하는 함수를 호출합니다.
        this.applyCustomStyles();


        // --- 3. 컨트롤 추가 (기존 코드) ---
        this.gui.add(this.params, "isMouse");
        this.gui.add(this.params, "osc_strength", 0.01, 0.5);
        this.gui.add(this.params, "buoyancy", 0.001, 0.3);
        this.gui.add(this.params, "mouse_force", 5, 60);
        this.gui.add(this.params, "cursor_size", 30, 120);
        this.gui.add(this.params, "isViscous");
        this.gui.add(this.params, "viscous", 0, 250);
        this.gui.add(this.params, "iterations_viscous", 1, 32);
        this.gui.add(this.params, "iterations_poisson", 1, 32);
        this.gui.add(this.params, "dt", 1 / 100, 1 / 30);
        this.gui.add(this.params, 'BFECC');
        this.gui.close();
    }
    destroy() {
        if (this.gui) {
            this.gui.destroy();
            this.gui = null; // 참조를 제거하여 가비지 컬렉션 돕기
        }
    }
}