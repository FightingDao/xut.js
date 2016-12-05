/**
 * 随机生成0-30之间的不重复的数字作为li的id
 * @return {[type]} [description]
 */
function createUnpeatableNumbers() {
    var rand = parseInt(Math.random() * 30);
    if ($("#oriHdimg" + rand).length > 0) {
        return createUnpeatableNumbers();
    }
    return rand;
}

const transEndEventName = Xut.plat.transitionEnd
const supportTransitions = true

/**
 * 图片缩放功能
 * 2016.12.5
 */
export default class Zoom {

    constructor(originSrc, hdSrc) {

        var uniqueId = createUnpeatableNumbers();

        this.liId = "oriHdimg" + uniqueId;
        this.originSrc = originSrc;
        var self = this;
        _initStructure(originSrc);

        let svImageTransitionSpeedFade = 300,
            svImageTransitionEasingFade = 'ease-in-out',
            svImageTransitionSpeedResize = 300,
            svImageTransitionEasingResize = 'ease-in-out',
            svMargins = { vertical: 0, horizontal: 0 },
            speed = 300,
            easing = 'ease',
            overlayAnimated = true;


        this.$element = null;
        this.$body = $('body');
        this.isAnimating = true;
        this.fly = null;
        this.svImage = null;
        this.container = $('body');
        this.overlay = $('div.gamma-overlay')
        this.svclose = null;
        this.singleview = null;

        this.screenWidth = document.documentElement.clientWidth || $(window).width();
        this.screenHeight = document.documentElement.clientHeight || $(window).height();


        //放大层是否已经出现
        this.isSV = false;


        this._closeSingleViewTimer = null;
        this.singleViewItemTimer = null;
        this.flyTimer = null;
        // this.isFly = false;


        // checks if an element is partially inside the viewport
        // inspired by James Padolsey's snippet (http://remysharp.com/2009/01/26/element-in-view-event-plugin/#comment-127058)
        $.extend($.expr[':'], {
            inViewport: function(el) {
                let scrollTop = (document.documentElement.scrollTop || document.body.scrollTop)
                let elOffsetTop = $(el).offset().top
                let elH = $(el).height()
                let winH = (window.innerHeight && window.innerHeight < $(window).height()) ? window.innerHeight : $(window).height();

                return (elOffsetTop + elH) > scrollTop && elOffsetTop < (scrollTop + winH);
            }
        });


        function _createSingleView() {
            // the single view will include the image, navigation buttons and close, play, and pause buttons
            if (!$("div.gamma-single-view").length) {
                var isPc = _IsPC();
                //pc端
                if (isPc) {
                    $('<div class="gamma-single-view"><div class="gamma-options gamma-options-single"><div class="gamma-buttons" ><button style="width:30px;height:30px;font-size:14px;margin-left:5px;" class="gamma-btn-close"></button></div></div></div>')
                        .appendTo(self.container);
                } else {
                    //移动端
                    //横屏
                    if (self.screenWidth > self.screenHeight) {
                        $('<div class="gamma-single-view"><div class="gamma-options gamma-options-single"><div class="gamma-buttons" style="width:4vw;height:4vw;"><button class="gamma-btn-closeHorizontal gamma-btn-close"  style="width:100%;height:100%;font-size:2vw;"></button></div></div></div>')
                            .appendTo(self.container);
                    } else {
                        //竖屏
                        $('<div class="gamma-single-view"><div class="gamma-options gamma-options-single"><div class="gamma-buttons" style="width:4vh;height:4vh;"><button class="gamma-btn-closeVertical gamma-btn-close" style="width:100%;height:100%;"></button></div></div></div>')
                            .appendTo(self.container);
                    }
                }




            }
            self.singleview = self.container.children('div.gamma-single-view');
            self.singleview.show();
            self.svclose = $('button.gamma-btn-close');
            self.svclose.on('click', _closeSingleView);
        }

        // closes the single view
        function _closeSingleView() {

            if (self.isAnimating || self.fly) return false;

            self.isSV = false;

            var $item = self.$element,
                $img = $item.children('img');

            // scroll window to item's position if item is not "partially" visible
            var wst = $(window).scrollTop();

            if (!$item.is(':inViewport')) {
                wst = $item.offset().top + ($item.outerHeight(true) - $item.height()) / 2;
                var diff = $(document).height() - $(window).height();
                if (wst > diff) wst = diff;
                $(window).scrollTop(wst);
            }



            var l = self.svImage.position().left + $(window).scrollLeft(),
                t = self.svImage.position().top + wst;

            self.svImage.appendTo(self.$body).css({
                position: 'absolute',
                zIndex: 10000,
                left: l,
                top: t
            });

            if (supportTransitions) _setTransition(self.svImage);
            self.singleview.hide();
            self.$body.css('overflow-y', 'scroll');

            self._closeSingleViewTimer = setTimeout(function() {
                var styleCSS = {
                    width: $img.width(),
                    height: $img.height(),
                    left: $item.offset().left + ($item.outerWidth(true) - $item.width()) / 2,
                    top: $item.offset().top + ($item.outerHeight(true) - $item.height()) / 2
                }
                _applyAnimation(self.svImage, styleCSS, speed, supportTransitions, function() {
                    $item.css('visibility', 'visible');
                    $(this).remove();
                    self.svImage = null;
                });

                // transition: overlay opacity
                if (overlayAnimated) {
                    if (supportTransitions) {
                        _setTransition(self.overlay, 'opacity');
                    }
                    _applyAnimation(self.overlay, { 'opacity': 0 }, speed, supportTransitions, function() {
                        var $this = $(this);
                        if (supportTransitions) $this.off(transEndEventName);
                        $this.hide();
                    });
                } else {
                    self.overlay.hide();
                }
                //清除定时器
                _destroyTimer();


            }, 25);

            //移除高清图片层
            self.singleview.remove();

        }

        // sets a transition for an element
        function _setTransition(el, property, speed, easing) {
            if (!property) property = 'all';
            if (!speed) speed = 300;
            if (!easing) easing = 'ease';
            el.css('transition', property + ' ' + speed + 'ms ' + easing);
        }

        // apply a transition or fallback to jquery animate based on condition (cond)
        function _applyAnimation(el, styleCSS, speed, cond, fncompvare) {

            $.fn.applyStyle = cond ? $.fn.css : $.fn.animate;
            if (fncompvare && cond) el.on(transEndEventName, fncompvare);
            fncompvare = fncompvare || function() {
                return false;
            };
            el.stop().applyStyle(styleCSS, $.extend(true, [], { duration: speed + 'ms', compvare: fncompvare }));
        }

        // choose a source based on the item's size and on the configuration set by the user in the initial HTML
        function _chooseImgSource(sources, w) {
            if (w <= 0) w = 1;
            for (var i = 0, len = sources.length; i < len; ++i) {
                var source = sources[i];
                if (w > source.width)
                    return source;
            }
        }

        function _IsPC() {
            var userAgentInfo = navigator.userAgent;
            var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
            var flag = true;
            for (var v = 0; v < Agents.length; v++) {
                if (userAgentInfo.indexOf(Agents[v]) > 0) {
                    flag = false;
                    break;
                }
            }
            return flag;
        }

        // given the wrapper's width and height, calculates the final width, height, left and top for the image to fit inside
        function _getFinalSizePosition(imageSize, wrapperSize) {

            // image size
            var imgW = imageSize.width,
                imgH = imageSize.height,
                // container size
                wrapperW = wrapperSize.width,
                wrapperH = wrapperSize.height,
                finalW, finalH, finalL, finalT,
                // flag to indicate we could check for another source (smaller) for the image
                checksource = false,
                ratio;

            //宽度100% 自适应高度
            var widthFullAdaptiveHeight = function() {
                finalW = wrapperW;
                // calculate the height given the finalW
                ratio = imgW / wrapperW;
                finalH = imgH / ratio;
                if (finalH > wrapperH) {
                    checksource = true;
                    ratio = finalH / wrapperH;
                    finalW /= ratio;
                    finalH = wrapperH;
                }
            }

            //高度100% 自适应宽度
            var heightFullAdaptiveWidth = function() {
                    finalH = wrapperH;
                    // calculate the width given the finalH
                    ratio = imgH / wrapperH;
                    finalW = imgW / ratio;
                    checksource = true;
                    if (finalW > wrapperW) {
                        checksource = false;
                        ratio = finalW / wrapperW;
                        finalW = wrapperW;
                        finalH /= ratio;
                    }
                }
                // check which image side is bigger
                //横屏图片
            if (imgW > imgH) {
                widthFullAdaptiveHeight();
            } else {
                //竖屏图片
                //竖版显示
                if (wrapperH > wrapperW) {
                    widthFullAdaptiveHeight();
                }
                //横版显示
                else {
                    heightFullAdaptiveWidth();
                }

            }

            return {
                width: finalW,
                height: finalH,
                left: wrapperW / 2 - finalW / 2,
                top: wrapperH / 2 - finalH / 2,
                checksource: checksource
            }
        }

        // gets the position and sizes of the image given its container properties
        function _getFinalImgConfig(properties) {
            var sources = properties.sources,
                imgMaxW = properties.imgMaxW || 0,
                imgMaxH = properties.imgMaxH || 0,
                source = _chooseImgSource(sources, properties.wrapper.width),
                // calculate final size and position of image
                finalSizePosition = _getFinalSizePosition(properties.image, properties.wrapper);

            // check for new source
            if (finalSizePosition.checksource) {
                source = _chooseImgSource(sources, finalSizePosition.width);

            }

            // we still need to check one more detail:
            // if the source is the largest one provided in the html rules,
            // then we need to check if the final width/height are eventually bigger
            // than the original image sizes. If so, we will show the image 
            // with its original size, avoiding like this that the image gets pixelated
            if (source.pos === 0 && (imgMaxW !== 0 && finalSizePosition.width > imgMaxW || imgMaxH !== 0 && finalSizePosition.height > imgMaxH)) {
                if (imgMaxW !== 0 && finalSizePosition.width > imgMaxW) {
                    var ratio = finalSizePosition.width / imgMaxW;
                    finalSizePosition.width = imgMaxW;
                    finalSizePosition.height /= ratio;
                } else if (imgMaxH !== 0 && finalSizePosition.height > imgMaxH) {
                    var ratio = finalSizePosition.height / imgMaxH;
                    finalSizePosition.height = imgMaxH;
                    finalSizePosition.width /= ratio;
                }
                finalSizePosition.left = properties.wrapper.width / 2 - finalSizePosition.width / 2;
                finalSizePosition.top = properties.wrapper.height / 2 - finalSizePosition.height / 2;
            }
            return {
                source: source,
                finalSizePosition: finalSizePosition
            }

        }

        // shows the item
        function _singleviewitem($item, anim) {
            self.$element = $item;
            var $img = $item.children('img');
            self.isSV = true;
            //self.isFly = true;
            var id = $item.index(),
                data = $item.data();
            if (anim) {
                self.fly = $('<img/>').attr('src', $img.attr('src')).addClass('gamma-img-fly').css({
                    width: $img.width(),
                    height: $img.height(),
                    left: $item.offset().left + ($item.outerWidth(true) - $item.width()) / 2,
                    top: $item.offset().top + ($item.outerHeight(true) - $item.height()) / 2
                }).appendTo(self.$body);

                if (supportTransitions) _setTransition(self.fly);
            }
            // need to know which source to load for the image.
            // also need to know the final size and position.
            self.finalConfig = _getFinalImgConfig({
                sources: $item.data('source'),
                imgMaxW: $item.data('maxwidth'),
                imgMaxH: $item.data('maxheight'),
                wrapper: { width: (document.documentElement.clientWidth - svMargins.horizontal) || ($(window).width() - svMargins.horizontal), height: (document.documentElement.clientHeight - svMargins.vertical) || ($(window).height() - svMargins.vertical) },
                image: { width: $img.width(), height: $img.height() }
            });
            var source = self.finalConfig.source,
                finalSizePosition = self.finalConfig.finalSizePosition;

            // transition: overlay opacity
            self.overlay.show();
            _setTransition(self.overlay, 'opacity');
            self.singleViewItemTimer = setTimeout(function() {
                _applyAnimation(self.overlay, { 'opacity': 1 }, 300, supportTransitions || !anim, function() {
                    if (self.isSV) return false;
                    if (supportTransitions) $(this).off(transEndEventName);
                    // set the overflow-y to hidden
                    self.$body.css('overflow-y', 'hidden');
                    // force repaint. Chrome in Windows does not remove overflow..
                    // http://stackoverflow.com/a/3485654/989439
                    self.overlay[0].style.display = 'none';
                    // self.overlay[0].offsetHeight; // no need to store this anywhere, the reference is enough
                    self.overlay[0].style.display = 'block';
                });
                $item.css('visibility', 'hidden');
                if (!anim) {
                    _loadSVItemFromGrid(data, finalSizePosition, source.src);
                } else {
                    var styleCSS = {
                            width: finalSizePosition.width,
                            height: finalSizePosition.height,
                            left: finalSizePosition.left + $(window).scrollLeft() + svMargins.horizontal / 2,
                            top: finalSizePosition.top + $(window).scrollTop() + svMargins.vertical / 2
                        },
                        cond = supportTransitions;

                    _applyAnimation(self.fly, styleCSS, speed, cond, function() {
                        //if(!self.isFly) return false;
                        if (cond) {
                            $(this).off(transEndEventName);
                        }
                        _loadSVItemFromGrid(data, finalSizePosition, source.src);

                    });
                }
            }, 25);
        }

        // load new image for the new item to show
        function _loadSVItemFromGrid(data, position, src) {
            // show single view
            self.singleview.show();

            // loading status: give a little amount of time before displaying it
            var loadingtimeout = setTimeout(function() { self.singleview.addClass('gamma-loading'); }, svImageTransitionSpeedFade + 250);
            // preload the new image
            self.svImage = $('<img/>').load(function() {
                var $img = $(this);
                // remove loading status
                clearTimeout(loadingtimeout);
                loadingtimeout = null;
                self.singleview.removeClass('gamma-loading');

                $img.css({
                    width: position.width,
                    height: position.height,
                    left: position.left + svMargins.horizontal / 2,
                    top: position.top + svMargins.vertical / 2
                }).appendTo(self.singleview);
                if (supportTransitions) {
                    _setTransition($img, 'all', svImageTransitionSpeedResize, svImageTransitionEasingResize);
                }

                if (self.fly) {
                    if (supportTransitions) {
                        _setTransition(self.fly, 'opacity', 1000);
                    }
                    self.flyTimer = setTimeout(function() {
                        _applyAnimation(self.fly, { 'opacity': 0 }, 1000, supportTransitions, function() {
                            var $this = $(this);
                            if (supportTransitions) {
                                $this.off(transEndEventName);
                            }
                            $this.remove();
                            self.fly = null;
                            self.isAnimating = false;
                        });
                    }, 25);
                } else {
                    self.isAnimating = false;
                }
            }).data(data).attr('src', src);

        }


        function _initStructure(originSrc) {
            self.imgObject = $('img[src|="' + originSrc + '"]')
            self.imgObject.wrap("<div/>").wrap("<ul/>").wrap('<li id="' + self.liId + '" />')
                //存在背景层则不重复添加到页面上
            if (!$("div.gamma-overlay").length) {
                $(' <div class="gamma-overlay"></div>').appendTo(self.imgObject.parent().parent().parent().parent())
            }

        }

        function _destroyTimer() {
            //清除定时器
            self._closeSingleViewTimer && clearTimeout(self._closeSingleViewTimer)
            self._closeSingleViewTimer = null;

            self.singleViewItemTimer && clearTimeout(self.singleViewItemTimer)
            self.singleViewItemTimer = null;

            self.flyTimer && clearTimeout(self.flyTimer)
            self.flyTimer = null;
        }


        function _bindGamma() {
            $("#" + self.liId + " img").on("click", function() {
                _createSingleView();
                var $item = $("#" + self.liId),
                    $picEl = $(this);


                // data is saved in the <li> element*/
                $item.data({
                    source: [{
                        pos: 0,
                        src: hdSrc,
                        width: 200
                    }]
                });
                _singleviewitem($item, true);
            });
        }


        _bindGamma();

    }

    destroy() {
        this.overlay && this.overlay.remove();
        this.overlay = null;
        this.container = null;
        this.$body = null;

        //背景层移除
        this.singleview && this.singleview.remove();
        this.singleview = null;

        //解除关闭按钮绑定事件 
        if (this.svclose) {
            this.svclose.off("click", this._closeSingleView)
            this.svclose = null;
        }

        //放大后的位置信息清空
        if (this.finalConfig) {
            this.finalConfig.finalSizePosition = null;
            this.finalConfig.source = null;
            this.finalConfig = null;
        }

        //清除定时器
        this._closeSingleViewTimer && clearTimeout(this._closeSingleViewTimer)
        this._closeSingleViewTimer = null;

        this.singleViewItemTimer && clearTimeout(this.singleViewItemTimer)
        this.singleViewItemTimer = null;

        this.flyTimer && clearTimeout(this.flyTimer)
        this.flyTimer = null;


        //解除img绑定的事件 清空数据

        $("#" + this.liId + " img").off("click");
        $("#" + this.liId).removeData();
        this.$element = null;


        //还原原有图片结构
        this.imgObject.insertBefore($("#" + this.liId).parent().parent())
        this.imgObject.next().remove();
        this.imgObject = null;

    }

}
