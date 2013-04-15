//ui跟编辑器的适配層
//那个按钮弹出是dialog，是下拉筐等都是在这个js中配置
//自己写的ui也要在这里配置，放到baidu.editor.ui下边，当编辑器实例化的时候会根据editor_config中的toolbars找到相应的进行实例化
(function () {
    var domUtils = baidu.editor.dom.domUtils,
        editorui = baidu.editor.ui;
    editorui.buttons = {};

    /*
    * ----------------分界线----------------------
    * for zhidao by xuheng
    * */
    var $ = function (id) {
        return document.getElementById(id);
    };


    editorui.insertimage = function (editor) {
        var iframeUrl = editor.options.buttonConfig["insertimage"],
            title = iframeUrl['title'],
            hovertitle = iframeUrl['hoverTitle'],
            overflowMsg = iframeUrl['overflowMsg'],
            obj, containerID = "ue_con_" + +new Date();
        var ui = new editorui.Button({
            className:'edui-for-insertimage',
            title:hovertitle || '',
            label:title || '',
            getHtmlTpl:function () {
                return '<div id="##" class="edui-box %%" ' + (this.title ? 'title="' + this.title + '"' : '') + '>' +
                    '<div id="##_state" stateful>' +
                    '<div class="%%-wrap">' +
                    '<div id="##_body" unselectable="on" class="%%-body" >' +
                    (this.showIcon ? '<div class="edui-box edui-icon"></div>' : '') +
                    (this.showText ? '<div class="edui-box edui-label">' + this.label + '</div>' : '') +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div id="' + containerID + '" class="ue_flash"></div>' +
                    '</div>';
            },
            onmouseover: function (evt) {
                UE.ui.Popup.postHide(evt);
            },
            showText:true
        });


        ui.addListener("renderReady", function () {
            domUtils.on(ui.getDom(), "mouseover", function (e) {
                ui.addState("hover");
            });
            domUtils.on(ui.getDom(), "mouseout", function (e) {
                ui.removeState("hover");
            });

            var flashid = "ue_flash_" + +new Date();
            baidu.swf.create({
                id:flashid,
                url:editor.options.flashUrl, //flash地址
                width:"48", //flash舞台宽度
                height:"22", //flash舞台高度
                errorMessage:"您的Flash插件版本过低，请更新后再尝试！",
                wmode:"transparent", //设为透明
                ver:"9.0.0",
                // 初始化传入flash的参数，width和height是设置按钮的宽高,url是上传的地址,fieldName为表单名，title为表单标签
                vars:{
                    width:48,
                    height:22,
                    fileExtension:editor.options.acceptImageType,
                    fileSize:editor.options.imageMaxSize
                }
            }, containerID);

            //修复flash版本低时问题
            var flashContainer = $(containerID);
            if (!flashContainer.children[0]) {
                if (browser.firefox) {
                    flashContainer.innerText = "";
                } else {
                    flashContainer.textContent = "";
                }
                flashContainer.title = "您的Flash插件版本过低，请更新后再尝试！";
            }

            var t = setInterval(checkState, 50);
            obj = baidu.swf.getMovie(flashid);
            //五个回调
            var success = "ue_success" + +new Date,
                error = "ue_error" + +new Date,
                select = "ue_select" + +new Date,
                checkupload = "ue_checkupload" + +new Date,
                logout = "ue_logout" + +new Date;

            function checkState() {
                if (obj && obj.flashInit && obj.flashInit()) {
                    clearInterval(t);
                    // 设置透明的flash为手型
                    obj.setHandCursor(true);
                    //注：设置被调用的函数名，顺序不能变，uploadComplete上传完成。uploadError上传失败。selectFileCheck文件检查。logFailed未登录提示
                    obj.setJSFuncName([success, error, select, logout, checkupload]);
                    //obj.setMEFuncName("gestureType");	// 设置flash鼠标事件的响应函数
                }
            }

            if (!editor.options.isLogin) {
                var dom = ui.getDom(),
                    label = $(dom.id + "_body").children[1];
                label.style.color = "#999";
                dom.setAttribute("title", hovertitle);

                var icon = $(dom.id + "_body").children[0];
                domUtils.removeClasses(icon, ["edui-icon"]);
                domUtils.addClass(icon, "edui_disableIcon");
            }

            window[checkupload] = function () {
                //获取当前是否登录状态
                editor.fireEvent("flashClicked");
                return editor.options.isLogin;
            };
            window[select] = function (data) {
                if (data.errorNo) {
                    editor.fireEvent("imageSizeError");
                    return;
                }
                var index = +new Date,
                    src = editor.options.waitImageUrl;
                editor.execCommand("insertimage", {
                    id:"ue_waitflag_" + index,
                    src:src,
                    data_ue_src:src
                });
                editor.fireEvent("contentchange");

                var customObj = editor.options.customObj;
                customObj['position'] = index;
                customObj['editorIndex'] = containerID;
                obj.upload(editor.options.imageUrl, editor.options.imageFieldName, customObj);
            };

            window[success] = function (data) {
                replaceWait(data.index, data.url ? editor.options.imagePath + data.url : null);
                editor.fireEvent("uploadSuccess", data);
            };
            window[logout] = function () {
                editor.fireEvent("isLogout");
            };
            window[error] = function (msg) {
                replaceWait(msg.index);
                editor.fireEvent("networkError", msg);
            };

            function fixFlash(editor) {
                //解决flash和中文输入法不兼容问题
                if (baidu.editor.browser.chrome) {
                    var input = document.createElement("input");
                    input.type = "text";
                    input.style.height = "0";
                    input.style.width = "0";
                    editor.container.parentNode.appendChild(input);
                    setTimeout(function () {
                        input.focus();
                        editor.focus();
                        input.parentNode.removeChild(input);
                    }, 1);
                }
            }

            function replaceWait(index, url) {
                var image = editor.document.getElementById("ue_waitflag_" + index);
                image.hasLoaded = false;
                if (url && image) {
                    image.setAttribute("data_ue_src", url);
                    image.removeAttribute("id");
                    image.onload = function () {
                        if (this.hasLoaded)return;
                        this.hasLoaded = true;
                        var span = editor.document.createElement('span');
                        span.style.cssText = 'display:block;width:0;margin:0;padding:0;border:0;clear:both;';
                        span.innerHTML = '.';
                        var tmpNode = span.cloneNode(true);
                        editor.selection.getRange().insertNode(tmpNode);
                        domUtils.scrollToView(tmpNode, domUtils.getWindow(tmpNode), 0);
                        tmpNode && tmpNode.parentNode.removeChild(tmpNode);
                        editor.fireEvent("contentchange");
                    };
                    image.src = url;
                } else {
                    image && image.parentNode.removeChild(image);
                }
                //解决flash和中文输入法不兼容问题
                fixFlash(editor);

                editor.fireEvent("contentchange");
            }

        });
        /**
         * 检测flash方法是否具备，
         * @param fn  检测的方法
         * @param step  检测间隔毫秒数
         * @param num  检测次数上限
         */
        function checkFlashFun(flashObj, fn, step, num) {
            if (!flashObj) return;
            var time = setInterval(function () {
                if (num == 0)clearInterval(time);
                if (!flashObj[fn]) {
                    num--;
                } else {
                    flashObj[fn]();
                    clearInterval(time);
                }
            }, step);
        }

        editor.addListener('selectionchange', function () {
            var state = editor.queryCommandState("insertimage"),
                dom = ui.getDom(),
                label = $(dom.id + "_body").children[1];
            if (!editor.options.isLogin) {
                label.style.color = "#999";
                dom.setAttribute("title", hovertitle);

                var icon = $(dom.id + "_body").children[0];
                domUtils.removeClasses(icon, ["edui-icon"]);
                domUtils.addClass(icon, "edui_disableIcon");
                return;
            }

            if (state == -1) {
                label.style.color = "#999";
                checkFlashFun(obj, "disabledUpload", 200, 100);
                ui.getDom().setAttribute("title", overflowMsg);
            } else {
                label.style.color = "";
                checkFlashFun(obj, "enabledUpload", 200, 100);
                ui.getDom().setAttribute("title", hovertitle);
            }

        });
        return ui;
    };

    editorui.insertmap = function (editor) {
        var iframeUrl = editor.options.buttonConfig["insertmap"],
            title = iframeUrl.title,
            unTitle = iframeUrl.unTitle,
            hoverTitle = iframeUrl.hoverTitle;
        var ui = new editorui.Button({
            className:'edui-for-insertmap insertmap',
            title:hoverTitle,
            label:title,
            onmouseover: function (evt) {
                UE.ui.Popup.postHide(evt);
            },
            onclick:function () {
                if (editor.options.isLogin) {
                    ik.qb.neweditor.showMap(editor);
                }
            },
            showText:true
        });
        ui.addListener("renderReady", function () {
            if (!editor.options.isLogin) {
                var dom = ui.getDom(),
                    label = $(dom.id + "_body").children[1],
                    icon = $(dom.id + "_body").children[0];
                label.style.color = "#999";
                dom.setAttribute("title", hoverTitle);
                domUtils.removeClasses(icon, ["edui-icon"]);
                domUtils.addClass(icon, "edui_disableIcon");
            }
        });

        editor.addListener('selectionchange', function () {
            var state = editor.queryCommandState("insertmap"),
                dom = ui.getDom(),
                label = $(dom.id + "_body").children[1];
            if (!editor.options.isLogin) {
                label.style.color = "#999";
                ui.getDom().setAttribute("title", hoverTitle);

                var icon = $(dom.id + "_body").children[0];
                domUtils.removeClasses(icon, ["edui-icon"]);
                domUtils.addClass(icon, "edui_disableIcon");
                return;
            }

            if (state == -1) {
                ui.onclick = function () {
                    editor.execCommand("deletemap");
                };
                ui.removeClass(["insertmap"]);
                ui.addClass("deletemap");
                ui.getDom().setAttribute("title", unTitle);
                label.innerHTML = unTitle;
            } else {
                ui.onclick = function () {
                    ik.qb.neweditor.showMap(editor);
                };
                ui.removeClass(["deletemap"]);
                ui.addClass("insertmap");
                ui.getDom().setAttribute("title", hoverTitle);
                label.innerHTML = title;
            }
        });
        return ui;
    };

    editorui.attachment = function (editor) {
        var cmd = 'attachment',
            title = '附件',
            hoverTitle = '网盘文件共分享，插入附件更方便',
            attachPop;

        var ui = new editorui.Button({
            className:'edui-for-'+cmd,
            title:hoverTitle,
            label:title || '',
            onmouseover: function (evt) {
                if(!attachPop) setAttachPop();
                UE.ui.Popup.postHide(evt);
                attachPop.showAnchor(this.getDom());
            },
            onclick:function (evt) {
                if(!attachPop) setAttachPop();
                UE.ui.Popup.postHide(evt);
                attachPop.showAnchor(this.getDom());
            },
            theme:editor.options.theme,
            showText:true
        });

        function setAttachPop(){
            attachPop = new baidu.editor.ui.Popup({
                content:new baidu.editor.ui.AttachPicker({editor:editor}),
                editor:editor,
                className:'edui-attachPop'
            });
            attachPop.render();
        }

        return ui;
    };

    var lists = ['insertorderedlist', 'insertunorderedlist', 'autotypeset'];
    for (var l = 0, cl; cl = lists[l++];) {
        (function (cmd) {
            editorui[cmd] = function (editor) {
                var iframeUrl = editor.options.buttonConfig[cmd],
                    title = iframeUrl['title'],
                    hoverTitle = iframeUrl.hoverTitle;
                var ui = new editorui.Button({
                    className:'edui-for-' + cmd + ' ' + cmd,
                    title:hoverTitle,
                    label:title || '',
                    onmouseover: function (evt) {
                        UE.ui.Popup.postHide(evt);
                    },
                    onclick:function () {
                        editor.fireEvent("beforeexeccmd", cmd);
                        if (editor.options.isLogin) {
                            editor.execCommand(cmd);
                        }
                    },
                    showText:true
                });
                ui.addListener("renderReady", function () {
                    if (!editor.options.isLogin) {
                        var dom = ui.getDom(),
                            label = $(dom.id + "_body").children[1];
                        label.style.color = "#999";
                        dom.setAttribute("title", hoverTitle);
                        var icon = $(dom.id + "_body").children[0];
                        domUtils.removeClasses(icon, ["edui-icon"]);
                        domUtils.addClass(icon, "edui_disableIcon");
                    }
                });

                editor.addListener('selectionchange', function (type, causeByUi, uiReady) {
                    var state = editor.queryCommandState(cmd),
                        dom = ui.getDom(),
                        label = $(dom.id + "_body").children[1];
                    if (!editor.options.isLogin) {
                        label.style.color = "#999";
                        dom.setAttribute("title", hoverTitle);

                        var icon = $(dom.id + "_body").children[0];
                        domUtils.removeClasses(icon, ["edui-icon"]);
                        domUtils.addClass(icon, "edui_disableIcon");
                        return;
                    }
                    if (state == -1) {
                        ui.setDisabled(true);
                        ui.setChecked(false);
                    } else {
                        if (!uiReady) {
                            ui.setDisabled(false);
                            ui.setChecked(state);
                        }
                    }
                });
                return ui;
            };
        })(cl);
    }
})();
