class EventBus{
    /**
     * Initialize a new event bus instance.
     */
    constructor(){
        this.bus = document.createElement('fakeelement');
    }

    /**
     * Add an event listener.
     */
    on(event, callback){
        this.bus.addEventListener(event, callback);
    }

    /**
     * Remove an event listener.
     */
    off(event, callback){
        this.bus.removeEventListener(event, callback);
    }

    /**
     * Dispatch an event. ( publish)
     * @param {string} event - 이벤트 이름
     * @param {Object} detail - 이벤트와 함께 전달할 데이터 객체
     */
    emit(event, detail = {}){
        this.bus.dispatchEvent(new CustomEvent(event, { detail }));
    }
}

export default new EventBus();