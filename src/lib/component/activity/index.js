/*******************************************
 *   文本类
 *     处理:
 *       1 异步转同步deferred处理
 *       2 dom结循环创建
 *       创建的四种行为
 *          1 默认创建结构绑定事件
 *          2 用于预先创建activityMode模式,分发动画与事件
 *          3 递归创建,关联子热点
 *          4 ppt文字动画,不创建主体结构,递归子热点
 *                  A 递归处理PPT动画
 *                  B 处理同步音频
 *                                      *
 ******************************************/

import textBoxMixin from './textbox/index'
import bookMarkMixin from './bookmark/index'
import searchBarMixin from './searchbar/index'
import eventMixin from './event/index'

import { hasAudioes } from '../audio/fix'
import { destroyContentEvent } from './event/event'

import createContent from './content/index'
import createTask from './task'

/**
 * 处理拖动对象
 * @return {[type]} [description]
 */
function accessDrop(eventData, callback) {
    if (eventData && eventData.dragDrop) {
        callback(eventData.dragDrop)
    }
}


export default class Activity {


    /**
     * activity触发器类
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    constructor(data) {

        _.extend(this, data)

        /**
         * 2016.4.11
         * 检测是所有的子任务必须完成
         * 因为canvas模式导致
         * 任务必须等待context上下创建
         * context就是pixi的直接对象，精灵..都是异步的
         */
        this.nextTask = createTask(this.noticeComplete)

        /**
         * 填充事件数据
         */
        this._fillEventData();

        /**
         * 保存子对象content
         * @type {Array}
         */
        this.abstractContents = createContent(this);

        /**
         * 处理html文本框
         * 2016.1.6
         */
        this._htmlTextBox();

        /**
         * 绑定事件
         */
        this._bindEventBehavior()

        /**
         * 初始化content行为
         */
        this._initContents()

        /**
         * 2016.2.26
         * 修复妙妙学
         * 妙妙客户端处理
         * 点击效果的音频处理
         * @type {Array}
         */
        this._fixAudio = []

        /**
         * 2016.11.2
         * 缓存点击的音频对象
         * 这样用于优化重复点击按钮的时候触发音频
         * @type {Array}
         */
        this._cacheBehaviorAudio = {}

        /**
         * 如果存在content
         * 等待创建执行
         * @param  {[type]} this.nextTask.context.length()
         * @return {[type]}
         */
        if (this.nextTask.context.length()) {
            this.nextTask.context.wait = true;
            return this;
        }

        /**
         * 如果没有pixi的异步创建
         * 同步代码直接完成
         */
        this.noticeComplete();
    }


    /**
     * 初始化content行为
     * @return {[type]} [description]
     */
    _initContents() {

        const pageId = this.relatedData.pageId
        const $containsNode = this.$containsNode
        const collectorHooks = this.relatedCallback.contentsHooks
        const pageType = this.pageType

        this.eachAssistContents(function(scope) {

            var context, id, isRreRun, parameter;

            //针对必须创建
            if (!(context = scope.$contentNode)) {
                console.log('$contentNode不存在')
                return
            }

            //如果是视觉差对象，也需要实现收集器
            if (scope.processType === 'parallax') {
                collectorHooks(scope.pid, scope.id, scope);
                return;
            }

            //如果是动画才处理
            id = scope.id
            isRreRun = scope.isRreRun
            parameter = scope.getParameter();


            //如果不是预生成,注册动画事件
            if (isRreRun === undefined) {
                //初始化动画
                scope.init(id, context, $containsNode, pageId, parameter, pageType);
            }

            //绑定DOM一些属性
            this._toRepeatBind(id, context, isRreRun, scope, collectorHooks);
        });

    }


    /**
     * dom节点去重绑定
     * 在每一次构建activity对象中，不重复处理content一些特性
     * 1 翻页特性
     * 2 注册钩子
     * 3 预显示
     * @return {[type]} [description]
     */
    _toRepeatBind(id, context, isRreRun, scope, collectorHooks) {
        var indexOf, relatedData

        relatedData = this.relatedData

        //过滤重复关系
        //每个元素只绑定一次
        if (-1 !== (indexOf = relatedData.createContentIds.indexOf(id))) {
            //删除,去重
            relatedData.createContentIds.splice(indexOf, 1);
            //收集每一个content注册
            collectorHooks(scope.pid, id, scope);
            //增加翻页特性
            this._addIScroll(scope, context);
            //直接复位状态,针对出现动画 show/hide
            if (isRreRun) {
                //直接改变元素状态
                context.css({
                    'visibility': isRreRun
                })
            }
        }
    }

    /**
     * 增加翻页特性
     * 可能有多个引用关系
     * @return {[type]}         [description]
     */
    _addIScroll(scope, $contentNode) {

        var self = this,
            contentDas = scope.contentDas;

        /**
         * 给外部调用处理
         * @param  {[type]} contentNode [description]
         * @return {[type]}             [description]
         */
        const makeBindLinkFunction = function(scrollNode) {

            //滚动文本的互斥不显示做一个补丁处理
            //如果是隐藏的,需要强制显示,待邦定滚动之后再还原
            //如果是显示的,则不需要处理,
            let $parentNode = self.getContextNode(self.makePrefix('Content', scope.pid, scope.id))
            let visible = $parentNode.css('visibility')
            let resetStyle = function() {}
            let opacity

            if (visible == 'hidden') {
                opacity = $parentNode.css('opacity')
                //如果设置了不透明,则简单设为可见的
                //否则先设为不透明,再设为可见
                if (opacity == 0) {
                    $parentNode.css({
                        'visibility': 'visible'
                    })
                    resetStyle = function() {
                        $parentNode.css({
                            'visibility': visible
                        })
                    }
                } else {
                    $parentNode.css({
                        'opacity': 0
                    }).css({
                        'visibility': 'visible'
                    })
                    resetStyle = function() {
                        $parentNode.css({
                            'opacity': opacity
                        }).css({
                            'visibility': visible
                        })
                    }
                }
            }

            return function() {
                self.iscroll = new iScroll(scrollNode, {
                    scrollbars: true,
                    fadeScrollbars: true
                })

                //增加标记
                //在PPT动画中reset不还原
                scrollNode.setAttribute("data-iscroll", "true")

                resetStyle()
                resetStyle = null
                $parentNode = null
                scrollNode = null
            }
        }

        const bindIscroll = () => {
            $contentNode.css('overflow', 'hidden') //增加元素溢出隐藏处理
            $contentNode.children().css('height', '') //去掉子元素高度，因为有滚动文本框
            this.relatedCallback.iscrollHooks.push(makeBindLinkFunction($contentNode[0]))
        }

        //增加卷滚条标记
        //但是svg如果没有内容除外
        if (contentDas.isScroll) {
            const hasSVG = $contentNode.find('svg')
            if (hasSVG) {
                //必须保证svg有数据
                if (hasSVG.text()) {
                    bindIscroll()
                }
            }
            //如果不是svg数据，直接绑定
            else {
                bindIscroll()
            }
        }

        //如果是图片则补尝允许范围内的高度
        if (!contentDas.mask || !contentDas.isGif) {
            $contentNode.find && $contentNode.find('img').css({
                'height': contentDas.scaleHeight
            });
        }
    }


    /**
     * 制作一个查找标示
     * @return {[type]}
     */
    makePrefix(name, pid, id) {
        return name + "_" + pid + "_" + id;
    }


    /**
     * 从文档碎片中找到对应的dom节点
     * 查找的范围
     * 1 文档根节点
     * 2 文档容器节点
     * @param  {[type]} prefix [description]
     * @return {[type]}        [description]
     */
    getContextNode(prefix, type) {
        let node, $node, containerPrefix, contentsFragment

        //dom模式
        contentsFragment = this.relatedData.contentsFragment;
        if (node = (contentsFragment[prefix])) {
            $node = $(node)
        } else {
            //容器处理
            if (containerPrefix = this.relatedData.containerPrefix) {
                _.each(containerPrefix, function(containerName) {
                    node = contentsFragment[containerName];
                    $node = $(node).find('#' + prefix);
                    if ($node.length) {
                        return
                    }
                })
            }
        }
        return $node
    }



    /**
     * 复位独立动画
     * 提供快速翻页复用
     * @return {[type]} [description]
     */
    _resetAloneAnim() {
        //复位拖动对象
        accessDrop(this.eventData, function(drop) {
            drop.reset();
        })
    }


    /**
     * 动画运行之后
     * 1 创建一个新场景
     * 2 执行跳转到收费提示页面
     * 3 触发搜索工具栏
     * @return {[type]} [description]
     */
    _relevantOperation() {

        var scenarioInfo, eventContentId

        //触发事件的content id
        if (this.eventData) {
            eventContentId = this.eventData.eventContentId;
        }

        if (eventContentId) {

            //查找出当前节的所有信息
            if (scenarioInfo = this.relatedData.seasonRelated[eventContentId]) {

                //如果存在搜索栏触发
                if (scenarioInfo.SearchBar) {
                    this.createSearchBar();
                    return;
                }

                //如果存在书签
                if (scenarioInfo.BookMarks) {
                    this.createBookMark();
                    return;
                }

                //处理新的场景
                if (scenarioInfo.seasonId || scenarioInfo.chapterId) {
                    setTimeout(function() {
                        Xut.View.LoadScenario({
                            'scenarioId': scenarioInfo.seasonId,
                            'chapterId': scenarioInfo.chapterId
                        })
                    }, hasAudioes() ? 1000 : 0)
                    return
                }

                // console.log('content跳转信息出错',scenarioInfo)
            }
        }
    }


    /**
     * 保证正确遍历
     * @return {[type]} [description]
     */
    eachAssistContents(callback) {
        _.each(this.abstractContents, function(scope) {
            callback.call(this, scope)
        }, this)
    }


    /**
     * 运行动画
     * @param  {[type]} outComplete [动画回调]
     * @return {[type]}             [description]
     * evenyClick 每次都算有效点击
     */
    runAnimation(outComplete, evenyClick) {

        let self = this
        let pageId = this.relatedData.pageId

        if (evenyClick) {
            this.preventRepeat = false;
        }

        //防止重复点击
        if (this.preventRepeat) {
            return false;
        }

        this.preventRepeat = true;

        //如果没有运行动画
        if (!this.seed.animation) {
            this.preventRepeat = false;
            this._relevantOperation();
            return;
        }

        //创建的无行为content
        let partContentRelated = this.relatedData.partContentRelated

        //制作作用于内动画完成
        //等待动画完毕后执行动作or场景切换
        let captureAnimComplete = this.captureAnimComplete = function(counts) {
            return function(scope) {
                //动画结束,删除这个hack
                scope &&
                    scope.$contentNode &&
                    scope.$contentNode.removeProp &&
                    scope.$contentNode.removeProp('animOffset')

                //如果快速翻页
                //运行动画的时候，发现不是可视页面
                //需要关闭这些动画
                let closeAnim = (pageId != Xut.Presentation.GetPageId());

                if (closeAnim && scope) {
                    scope.stop && scope.stop(pageId);
                    scope.reset && scope.reset();
                }

                //捕获动画状态
                if (counts === 1) {
                    if (closeAnim) {
                        //复位动画
                        self._resetAloneAnim();
                    }
                    self.preventRepeat = false;
                    self._relevantOperation();
                    outComplete && outComplete();
                    self.captureAnimComplete = null;
                } else {
                    --counts;
                }

            }
        }(this.abstractContents.length);

        /**
         * 如果是preRun处理
         * @return {Boolean} [description]
         */
        const isRreRunPocess = function(scope) {
            //针对空跳过处理
            if (partContentRelated && partContentRelated.length && (-1 !== partContentRelated.indexOf(scope.id))) {
                captureAnimComplete()
            } else {
                //必须要修改
                if (scope.$contentNode) {
                    if (scope.canvasMode) {
                        console.log('canvsa isRreRunPocess')
                            //直接改变元素状态
                            //scope.$contentNode.view.style.visible = scope.isRreRun === 'visible' ? true : false;
                    } else {
                        //因为执行的顺序问题，动画与页面零件
                        //isscroll标记控制
                        if (!scope.$contentNode.attr('data-iscroll')) {
                            scope.$contentNode.css({
                                'visibility': scope.isRreRun
                            })
                        }
                    }
                }
                captureAnimComplete()
            }
        }

        //执行动画
        this.eachAssistContents(function(scope) {
            if (scope.isRreRun) {
                isRreRunPocess(scope);
            } else {

                //标记动画正在运行
                scope.$contentNode && scope.$contentNode.prop && scope.$contentNode.prop({
                    'animOffset': scope.$contentNode.offset()
                })

                //ppt动画
                //ppt音频
                scope.play(function() {
                    captureAnimComplete(scope);
                });
            }
        })

        this.runState = true;
    }


    /**
     * 停止动画
     * @return {[type]} [description]
     */
    stopAnimation() {
        var pageId = this.relatedData.pageId;
        this.runState = false;
        this.eachAssistContents(function(scope) {
            !scope.isRreRun && scope.stop && scope.stop(pageId);
        })

    }


    /**
     * 销毁动画
     * @param  {[type]} elementCallback [description]
     * @return {[type]}                 [description]
     */
    _destroyAnimation(elementCallback) {
        //销毁拖动对象
        accessDrop(this.eventData, function(drop) {
            drop.destroy();
        })
        this.eachAssistContents(function(scope) {
            if (scope.destroy) {
                scope.destroy();
            }
            elementCallback && elementCallback(scope)
        })
    }


    /**
     * 自动运行
     * @param  {[type]} outComplete [description]
     * @return {[type]}             [description]
     */
    autoPlay(outComplete) {
        var eventData = this.eventData;
        if (eventData && eventData.eventName === 'auto') {
            this.runAnimation(outComplete);
        } else {
            outComplete();
        }
    }


    /**
     * 复位状态
     * @return {[type]} [description]
     */
    reset() {
        this.eachAssistContents(function(scope) {
            !scope.isRreRun && scope.reset && scope.reset(); //ppt动画
        })

        this._resetAloneAnim();
    }


    /**
     * 停止动作
     * @return {[type]} [description]
     */
    stop() {
        if (this.runState) {
            this.stopAnimation();
        }
        this.preventRepeat = false

        //复位盒子
        if (this.htmlBoxInstance.length) {
            _.each(this.htmlBoxInstance, function(instance) {
                instance.removeBox();
            })
        }

        //修复妙妙客户端
        //没有点击音频结束的回调
        //最多允许播放5秒
        if (this._fixAudio.length) {
            _.each(this._fixAudio, function(instance) {
                setTimeout(function() {
                    instance.end();
                }, 5000)
            })
            this._fixAudio = [];
        }
    }


    //销毁
    //提供一个删除回调
    //用于处理浮动对象的销毁
    destroy(elementCallback) {

        //销毁绑定事件
        if (this.eventData.eventContext) {
            destroyContentEvent(this.eventData);
            this.eventData.eventContext = null;
        }

        //2016.1.7
        //如果有文本框事件
        //一个activity允许有多个文本框
        //所以是数组索引
        if (this.htmlBoxInstance.length) {
            _.each(this.htmlBoxInstance, function(instance) {
                instance.destroy();
            })
            this.htmlBoxInstance = null;
        }

        //销毁动画
        this._destroyAnimation(elementCallback);
        this.abstractContents = null

        //iscroll销毁
        if (this.iscroll) {
            this.iscroll.destroy();
            this.iscroll = null;
        }

        //销毁搜索框
        if (this.searchBar) {
            this.searchBar.destroy();
            this.searchBar = null;
        }

        //销毁书签
        if (this.bookMark) {
            this.bookMark.destroy();
            this.bookMark = null;
        }

        //如果有点击音频
        if (Object.keys(this._cacheBehaviorAudio).length) {
            for (let key in this._cacheBehaviorAudio) {
                let audio = this._cacheBehaviorAudio[key]
                if (audio) {
                    audio.end()
                    this._cacheBehaviorAudio[key] = null
                }
            }
        }

        this.$containsNode = null;

    }

}


var activitProto = Activity.prototype;

textBoxMixin(activitProto)
bookMarkMixin(activitProto)
searchBarMixin(activitProto)
eventMixin(activitProto)
