/**
 *  创建主容器任务片
 *  state状态
 *      0 未创建
 *      1 正常创建
 *      2 创建完毕
 *      3 创建失败
 */
import { config } from '../../../config/index'
import { hasValue } from '../../../util/lang'

const TANSFROM = Xut.style.transform

/**
 * 创建页面容器li
 */
const createli = function({
    base,
    prefix,
    translate,
    customStyle,
    pageData,
    background
} = {}) {

    const getStyle = base.getStyle

    return String.styleFormat(
        `<li id="${prefix}"
            data-id="${pageData._id}"
            data-map="${base.pid}"
            data-pageType="${base.pageType}"
            data-container="true"
            class="xut-flip fix-transform"
            style="width:${getStyle.viewWidth}px;
                   height:${getStyle.viewHeight}px;
                   left:${getStyle.viewLeft}px;
                   top:${getStyle.viewTop}px;
                   ${TANSFROM}:${translate};
                   ${background}
                   ${customStyle}
                   overflow:hidden;">
            <div class="page-pinch"></div>
        </li>`
    )
}


/**
 * 创建父容器li结构
 */
const createContainer = (base, pageData, getStyle, prefix) => {

    let background = ''

    //chpater有背景，不是svg格式
    if (!/.svg$/i.test(pageData.md5)) {
        background = 'background-image:url(' + config.pathAddress + pageData.md5 + ');'
    }

    /**
     * 自定义配置了样式
     * 因为单页面跳槽层级的问题处理
     */
    let customStyle = ''
    let userStyle = getStyle.userStyle
    if (userStyle !== undefined) {
        //解析自定义规则
        _.each(userStyle, (value, key) => {
            customStyle += key + ':' + value + ';'
        })
    }

    return $(createli({
        base,
        prefix,
        translate: getStyle.translate,
        customStyle,
        pageData,
        background
    }))
}


export default function(base, pageData, taskCallback) {

    let $pageNode
    let $pseudoElement

    const prefix = base.pageType + "-" + (base.pageIndex + 1) + "-" + base.chapterId
    const getStyle = base.getStyle

    //iboosk编译
    //在执行的时候节点已经存在
    //不需要在创建
    if (Xut.IBooks.runMode()) {
        $pageNode = $("#" + prefix)
        taskCallback($pageNode, $pseudoElement)
        return
    }

    //创建的flip结构体
    $pageNode = createContainer(base, pageData, getStyle, prefix)

    Xut.nextTick({
        container: base.rootNode,
        content: $pageNode,
        position: getStyle.direction === 'before' ? 'first' : 'last'
    }, () => {
        taskCallback($pageNode, $pseudoElement)
    });
}
