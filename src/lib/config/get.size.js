/**
 * 屏幕尺寸
 * @return {[type]} [description]
 */
export function getSize() {
    //如果是IBooks模式处理
    if (Xut.IBooks.Enabled) {
        let screen = Xut.IBooks.CONFIG.screenSize;
        if (screen) {
            return {
                "width": screen.width,
                "height": screen.height
            }
        }
    }

    let clientWidth = document.documentElement.clientWidth || $(window).width()
    let clientHeight = document.documentElement.clientHeight || $(window).height()


    //配置可视区窗口
    if (Xut.config.visualHeight) {
        Xut.config.visualTop = clientHeight - Xut.config.visualHeight
        clientHeight = Xut.config.visualHeight
    }

    return {
        "width": clientWidth,
        "height": clientHeight
    }
}


/**
 * 排版判断
 * @return {[type]} [description]
 */
export function getLayerMode(screenSize) {
    return screenSize.width > screenSize.height ? "horizontal" : "vertical"
}
