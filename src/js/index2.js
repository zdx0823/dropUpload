$(function(){
    
    var upr = WebUploader.create({
        server: 'index.php',
        pick: '#picker',
        chunked: true,
        chunkSize: 5242880,
        chunkRetry: 20,
        threads: 1,
        formData: {
            store_dir:'data'
        },
        sendAsBinary:true,
        fileVal: 'file',
        duplicate: true,
        resize: false,
    }),
    queue = new WebUploader.Queue();

    upr.t_queue = [];

    // 加入队列前，判断文件是否合法
    upr.onBeforeFileQueued = function(file){

        file.node = {};
        file.node.t = this.c_dl({
            ext:file.ext,
            name:file.name,
            size:WebUploader.formatSize(file.size),
            file:file
        });
        file.node.p = file.node.t.find('.progress');

        if(file.size == 0){
            file.node.find('.progress').html('文件大小为空');
        }

    }
    
    // upr.onError = function(type){
    //     if(type == 'Q_TYPE_DENIED'){
    //         console.log('不允许上传该类型文件');
    //     }
    // }


    // 当一批文件加入队列后触发
    upr.onFilesQueued = function(files){

        // 让第一个文件开始上传，此时它的状态是queued
        var file = files[0];
        file && upr.reckon_file_md5(file).then(function(val){
            upr.build_folder(file,val).done(function(){
                upr.upload(file);
            });
        });

    }


    // 开始上传时触发
    upr.onStartUpload = function(){
    }

    // 暂停上传时触发
    upr.onStopUpload = function(){

    }
    
    // 某个文件开始上传前触发
    upr.onUploadStart = function(file){
        file.node.p.html('准备上传');
        // console.log(file);
 
    }

    // 某个分片上传前触发
    upr.onUploadBeforeSend = function(block,argu){
        if(!block.file.chunks) block.file.chunks = block.chunks;
        argu.md5 = block.file.md5
    }

    // 上传过程触发，携带进度
    upr.onUploadProgress = function(file,percentage){
        var percentage = (percentage*100).toFixed(2);

        // 当前前端全部上传完还要等待后端合并，此时设置进度为99%
        if(percentage >= 99) percentage = 99;
        file.node.p.html(percentage + '%');
    }

    // 上传成功触发
    upr.onUploadSuccess = function(file,response){
        // console.log(file);
        file.node.p.html('正在校验');
        $.post('index.php',
            {
                act:'merge',
                md5:file.md5,
                name:file.name,
                chunks:file.chunks,
                ext:file.ext,
                type:file.type
            }).done(function(data){

            var res = JSON.parse(data);
            if(res.status == 1){
                file.node.p.html('上传成功').css('color','#8BC34A');
            }else{
                file.node.p.html('上传失败').css('color','#f44336');
            }
        });

        // 从初始化好的列表中取出一个发送，如果成功它将从初始化列表里消失进入queued列表
        // var next_file = upr.getFiles('inited')[0];
        // if(next_file) upr.build_folder(next_file);
    }

    
    upr.onStopUpload = function(){
        console.log(8765);
    };
    



    /**************************自定义方法*******************************/
     
    /**
     * 发起请求生成临时文件夹，而后开始发送文件
     */
    upr.build_folder = function(file,val){
        
        file.node.p.html('正在初始化');

        // 设置钩子
        var dtd = $.Deferred();

        // 发起请求，创建临时文件
        $.post('index.php',{
            act:'init',
            md5s:val
        }).done(function(data){

            var res = JSON.parse(data);
            if(res.status == 1){
                file.node.p.html('初始化成功');
                file.md5 = val;
                dtd.resolve(upr);
            }else{
                dtd.reject();
            }

        });

        return dtd.promise();
    }

    
    /**
     * 取文件的开头10M，中间10M，末尾10M，分别计算出他们的MD5再拼接起来算一次MD5
     */
    upr.reckon_file_md5 = function(file){

        // 设置钩子
        var dtd = $.Deferred();

        // 读取长度
        var i = 10*1024*1024,
            size = file.size;

        // 如果文件大于30M就分开计算
        if(size > i*3){

            var t_md5 = '';

            // 依次读取，头10M，中间10M，末尾10M，
            upr.md5File(file,0,i).then(function(val){
                console.log('头10M  '+val);

                t_md5 += val;
                return upr.md5File(file,size/2,size/2+i);   // 返回结果promise

            }).then(function(val){
                console.log('中间10M  '+val);
                
                t_md5 += val;
                return upr.md5File(file,size-i,size);   // 返回结果promise

            }).then(function(val){
                console.log('末尾10M  '+val);

                t_md5 += val;
                return new Promise(function(resolve){   // 返回结果promise

                    var m_md5 = $.md5(t_md5);
                    var timer = setInterval(function(){
                        if(m_md5){
                            clearInterval(timer);
                            resolve(m_md5);
                            console.log(m_md5);
                        }
                    },30);
                    
                })

            }).then(function(val){
                // 完成返回
                dtd.resolve(val);
            });

        }else{
            // 文件小于10M直接算整个文件
            upr.md5File(file).then(function(val){
                console.log(val);
                t_md5 = val;
                dtd.resolve(t_md5);
            });
        }

        return dtd.promise();
    }


    upr.list_wrap = $('#upload_info');
    upr.con = upr.list_wrap.find('.con');


    /**
     * 生成节点
     */
    upr.c_dl = function(argu){
        var ext = argu.ext,
            name = argu.name,
            size = argu.size,
            fidname = argu.fidname || '我的文件',
            icon = cat.ii_path[ext] || cat.ii_path['unknown'],
            file = argu.file,
            o_dl = $('<dl>\
                <dt class="tit">\
                    <img src="'+icon+'" alt="">\
                    <p title="'+name+'">'+name+'</p>\
                </dt>\
                <dd class="size">'+size+'</dd>\
                <dd class="location"><a href="javascript:;">'+fidname+'</a></dd>\
                <dd class="progress">排队中</dd>\
                <dd class="btns">\
                    <a href="javascript:;" title="暂停" class="suspend"><i class="iconfont">&#xe750;</i></a>\
                    <a href="javascript:;" title="停止" class="close"><i class="iconfont">&#xeb2c;</i></a>\
                    <a href="javascript:;" title="重新开始" class="afresh"><i class="iconfont">&#xeb35;</i></a>\
                </dd>\
            </dl>').appendTo(upr.con);
            
            // 暂停按钮事件
            o_dl.find('.suspend').on('click',function(){

                console.log(123456);

                // 先暂停
                upr.stop(file);

                
                var next_file = upr.getFiles('inited')[0];
                // upr.upload(next_file);

                next_file && upr.reckon_file_md5(next_file)
                .then(function(val){
                    upr.build_folder(next_file,val)
                    .done(function(obj){
                        console.log(next_file);
                        // next_file.setStatus('queued');
                        obj.stop(true);
                        obj.upload(next_file);
                    });
                })

            });

        return o_dl;
    }


    var cat = {};
    // 存放目录的icon图标
    cat.ii_path = {
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


    cat.bbkb = function(size,point){
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


});