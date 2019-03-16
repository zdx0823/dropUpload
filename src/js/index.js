$(function(){

    // 用到的DOM元素
    var DOM = {
        con:$('.con'),
        head_span:$('#upload_info .head span'),
        tip:$('#upload_info .tip')
    };

    // 图标路径
    var ii_path = {
        csv:'lib/coloursIcon/csv.png',
        flash:'lib/coloursIcon/flash.png',
        html:'lib/coloursIcon/html.png',
        image:'lib/coloursIcon/image.png',
        mp:'lib/coloursIcon/mp.png',
        pdf:'lib/coloursIcon/pdf.png',
        ppt:'lib/coloursIcon/ppt.png',
        txt:'lib/coloursIcon/txt.png',
        unknown:'lib/coloursIcon/unknown.png',
        video:'lib/coloursIcon/video.png',
        folder:'lib/coloursIcon/wenjian.png',
        word:'lib/coloursIcon/word.png',
        xml:'lib/coloursIcon/xml.png',
        yasuobao:'lib/coloursIcon/yasuobao.png'     
    };


    /**
     * 根据字节转换单位
     *
     * @param {字节} size
     * @param {保留小树点} point
     * @returns
     */
    function bbkb(size,point){
        var B = 1, KB = 1024*B, MB = 1024*KB, GB = 1024*MB, TB = 1024*GB,
            point = point || 6,
            _res = null,
            res = null;
        if(size/TB >= 1)        _res = (size/TB).toFixed(point) + 'TB';
        else if(size/GB >= 1)   _res = (size/GB).toFixed(point) + 'GB';
        else if(size/MB >= 1)   _res = (size/MB).toFixed(point) + 'MB';
        else if(size/KB >= 1)   _res = (size/KB).toFixed(point) + 'KB';
        else                    _res = (size/B).toFixed(point) + 'B';
        res = parseInt(_res) == parseFloat(_res) ? parseInt(_res) + _res.match(/[A-Z]+/)[0] : _res;
        return res;
    };


    /**
     * 新建一条新的元素
     *
     * @param {文件id} file_id
     */
    function o_dl(file_id){

        var file = uploader.getFile(file_id),
            name = file.name,
            ext = name.substr(name.lastIndexOf('.')+1),
            icon = ii_path[ext] || 'unknown',
            size = bbkb(uploader.getSize(file_id),2),
            fidname = '我的文件';

      
        var o_dl = $('<dl>\
            <dt class="tit">\
                <img src="'+icon+'" alt="">\
                <p title="'+name+'">'+name+'</p>\
            </dt>\
            <dd class="size">'+size+'</dd>\
            <dd class="location"><a href="javascript:;">'+fidname+'</a></dd>\
            <dd class="progress">排队中</dd>\
            <dd class="btns">\
                <a href="javascript:;" file_id = '+file_id+' title="暂停" toggle="1" class="iconfont">&#xeb1c;</a>\
                <a href="javascript:;" file_id = '+file_id+' title="取消" toggle="2" class="iconfont">&#xeb22;</a>\
                <a href="javascript:;" file_id = '+file_id+' title="上传成功" toggle="0" class="success iconfont">&#xeb26;</a>\
            </dd>\
        </dl>').appendTo(DOM.con);

        file.DOM = {
            p:o_dl.find('.progress'),
            btns:o_dl.find('.btns')
        }
    }


    function o_ok_icon(){
        return '<i class="iconfont" style="font-size:26px; color:#4caf50;">&#xeb26;</i>'
    }



    function md5_file(file){
        
        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
                file = file,
                chunkSize = 10485760,   // 读10M
                chunks = Math.ceil(file.size / chunkSize),
                currentChunk = 0,
                spark = new SparkMD5.ArrayBuffer(),
                fileReader = new FileReader(),
                md5_file_dtd = $.Deferred();
    
        fileReader.onload = function (e) {
            spark.append(e.target.result);                   // Append array buffer
            currentChunk++;
    
            if (currentChunk < chunks) {
                console.log(currentChunk+'----'+chunks);
                loadNext();
            } else {
                var md5 = spark.end();
                // $('#md5_file').html(md5);
                md5_file_dtd.resolve(md5);
            }
        };
    
        fileReader.onerror = function () {
            console.warn('oops, something went wrong.');
        };
    
        function loadNext() {
            var start = currentChunk * chunkSize,
                end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
    
            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
        }
    
        loadNext();

        return md5_file_dtd.promise();
    }




    /**
     * 计算一小块blob的MD5
     *
     * @param {blob} chunk
     * @returns
     */
    function spark_md5(chunk){
        
        let dtd = $.Deferred(),
            spark = new SparkMD5.ArrayBuffer(),
            fileReader = new FileReader();

        // 将分片读入数组
        fileReader.readAsArrayBuffer(chunk);

        // 计算
        fileReader.onload = function(e){

            spark.append(e.target.result);
            dtd.resolve(spark.end());
            spark.destroy();
        
        };

        fileReader.onerror = function(){
            dtd.reject();
        };

        return dtd.promise();
    }


    // 新建fine upload的上传实例
    var uploader = new qq.FineUploaderBasic({

        // 后端地址
        request: { endpoint: 'index.php' },

        // 禁止自动上传
        autoUpload:false,

        // 指定“选择文件”按钮
        button: $('#picker')[0],

        // 开启调试功能
        debug:true,

        // 允许最大并发请求数，免得卡死
        MAXCONNECTIONS:1,

        // 当用户离开页面时候，弹出提示框
        warnBeforeUnload: true,

        // 分块
        chunking:{

            // 每个文件是否同时上传多个块
            concurrent:{ enabled:true },
            
            // 启用把文件拆分成块，每个块在单独的POST中发送
            enabled:true,

            // 强制每个文件都拆成块，即使文件小于块的最小大小
            mandatory:true,

            // 每个块最大大小，设置为5M
            partSize:5242880,

        },

        // 各种回调
        callbacks:{
          
            // 当选择完文件后触发,不管文件是否通过审核，参数有文件id和文件名
            onSubmit:function(file_id,filename){

                // 生成新节点
                o_dl(file_id);

            },


            // 文件通过审核后并提交给uploader对象后触发
            onSubmitted:function(file_id,filename){
                
                var file = uploader.getFile(file_id);
                // file.DOM.p.html('');

            },


            // 发送文件事件
            onUpload:function(file_id,filename){

                let file = uploader.getFile(file_id),
                    file_size = file.size,
                    file_status = uploader.getUploads({ id:file_id });
                    SUBMITTED = 'submitted',
                    t_primise = null,
                    uuid = uploader.getUuid(file_id),
                    dtd = $.Deferred();

                // 状态改变
                file.DOM.p.html('初始化');

                // 文件开始发送的时间
                file.st_time = +new Date();

                // file.md5_file_dtd = md5_file(file);

                $.post('index.php',{ act:'init', uuid:uuid })
                .done(function(data){
                    
                    var res = JSON.parse(data);
                    if(res.status == 1){
                        
                        file.DOM.p.html('初始化成功');
                        dtd.resolve();
                        file.md5s_obj = { length:0 };
                    
                    }else{
                        file.DOM.p.html('初始化失败');
                        dtd.reject();
                    }

                }).fail(function(){ 
                    file.DOM.p.html('初始化失败');
                    dtd.reject(); 
                });
            
                return dtd.promise();
            
            },


            // 分片发送前事件
            onUploadChunk:function(file_id,filename,chunkData){

                var up_chunk_dtd = $.Deferred();

                setTimeout(function(){
                    up_chunk_dtd.resolve({
                        endpoint:'index.php',
                        // 附加一条post参数
                        params:{ act:'save_chunk', }
                    });
                },5000);



                return up_chunk_dtd.promise();

                // return Promise.resolve({
                //     endpoint:'index.php',
                //     // 附加一条post参数
                //     params:{ act:'save_chunk', }
                // });

            },

            
            /**
             * 分片发生成功事件
             * file_id 当前分块所属文件的id
             * chunkData 分块的一些信息
             *      endByte: 96510486   终止量
             *      partIndex: 18       第几个分块，从0开始
             *      startByte: 94371841 起始量
             *      totalParts: 19      分片总数
             * responseJSON 来自服务器的响应
             * xhr 接收响应后的事件，可绑定回调函数
             *      
             */
            onUploadChunkSuccess:function(file_id,chunkData,responseJSON,xhr){
                
                let ci = chunkData.partIndex,
                    total = chunkData.totalParts,
                    blob = chunkData.blob,      // 此参数在原插件里没有，是我自己修改了插件
                    file = uploader.getFile(file_id);
                    
                spark_md5(blob).done(function(md5_val){
                    file.md5s_obj[ci] = md5_val;
                    file.md5s_obj.length++;
                });


                // file.md5_file_dtd.done(function(md5_val){
                //     $('#md5_file').html(md5_val);
                // });


                if(ci == total-1){
                    file.DOM.p.html('分片传输完成');
                    file.chunk_total = total;
                }
            },


            // 单个文件传输成功事件
            onComplete:function(file_id,filename,responseJSON,xhr){

                let file = uploader.getFile(file_id);

                if(responseJSON.success == true){
                    
                    // 状态改变
                    file.DOM.p.html('正在合并');

                    var md5s_obj = file.md5s_obj,       // 所以分片的MD5
                        _arr = [],                      // 临时数组
                        total = file.chunk_total,       // 分片总数
                        dtdarr = $.Deferred(),          // 钩子
                        st = +new Date(),               // 起始时间

                        // 等待对分块MD5运算全部完成,如果超过500ms还未完成视为失败
                        timer = setInterval(function(){

                            let diff = +new Date() - st;

                            if(diff <= 500){
                                if(md5s_obj.length == total){
                                    clearInterval(timer);
                                    dtdarr.resolve();
                                }
                            }else{
                                dtdarr.reject();
                            }

                        },10);

                    $.when(dtdarr.promise()).done(function(){

                        // 把分块从对象按顺序转移到数组
                        for(let i = 0; i < total; i++){
                            _arr.push(md5s_obj[i]);
                        }
                        // 合并再算一次
                        file.md5 = SparkMD5.hash(_arr.join(''));

                        // 发起合并请求
                        $.post('index.php',{ 
                            act:'merge',
                            uuid:uploader.getUuid(file_id),
                            file_md5:file.md5,
                            filename:filename,
                            totalparts:total,
                        })
                        .done(function(data){
                            var res = JSON.parse(data);

                            if(res.status == 1){
                                // 传输成功
                                file.DOM.p.html(o_ok_icon());   // 状态改变
                                DOM.tip.find('span').html('1个文件传输成功');
                                DOM.tip.css('opacity',1);
                                file.DOM.btns.hide();

                                // 文件发送完毕的时间
                                file.ed_time = +new Date();

                                console.log(file);
                                console.log(file.ed_time - file.st_time);

                            }else{
                                file.DOM.p.html('合并失败');
                            }

                        })
                        .fail(function(){
                            file.DOM.p.html('合并失败');
                            dtd.reject();
                        });

                    }).fail(function(){
                        // 如果分片MD5计算超时则取消本文件
                        file.DOM.p.html('合并失败');
                        uploader.cancel(file_id);
                        file.md5s_obj = '';
                    });
                }
            },

   
            // 状态改变事件
            onStatusChange:function(file_id,OLDSTATUS,NEWSTATUS){

                var ed = uploader.getUploads({ status:'upload successful' }).length,
                    all = uploader.getUploads({ status:'submitted' }).length;

                DOM.head_span.html(ed+'/'+all);
                    
            },


            // 文件取消事件
            onCancel:function(){
                return true;
            },


            onError:function(){},


            // 传输进度事件
            onProgress:function(file_id,filename,sent,filesize){
                var file = uploader.getFile(file_id);
                var percentage = (sent/filesize*100).toFixed(2) + '%';
                file.DOM.p.html(percentage);
            },

        }

    });
    

    // 列表点击事件，把每一条的点击委托给整个列表
    DOM.con.on('click',function(e){

        // 当点击目标有名为‘toggle’的属性将被视为‘暂停’，‘取消’等按钮
        if($(e.target).attr('toggle')){

            let target = $(e.target),
                file_id = target.attr('file_id'),
                file_status =  uploader.getUploads({ id:file_id }).status,
                UPLOADING = 'uploading',
                PAUSED = 'paused';

            // 当toggle属性的值为1被视为开始暂停按钮
            if(target.attr('toggle') == '1'){

                if(file_status == UPLOADING){
                    uploader.pauseUpload(file_id);      // 调用方法
                    target.html('&#xeaf8;').attr('title','开始');       // 状态改变
                    uploader.getFile(file_id).DOM.p.html('已暂停');     // 状态改变
                }else if(file_status == PAUSED){
                    uploader.continueUpload(file_id);   // 调用方法
                    target.html('&#xeb1c;').attr('title','暂停');       // 状态改变
                }

                
                // 当toggle属性的值为2被视为取消按钮
            }else if(target.attr('toggle') == '2'){

                if(file_status == UPLOADING || file_status == PAUSED){
                    uploader.cancel(file_id);
                    target.html('&#xeb37;');            // 状态改变
                    target.attr('title','已取消');      // 状态改变
                    target.parent().find('a[toggle=1]').hide(); // 状态改变
                    uploader.getFile(file_id).DOM.p.html('已取消').css('color','#795548');  // 状态改变
                }

            }
        }

    });



    $('#ctlBtn').on('click',function(){
        uploader.uploadStoredFiles();
    });


    // console.log();

});