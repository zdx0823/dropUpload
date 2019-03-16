<?php
define('DIR_TMP','D:/wwwData/tmp');
define('DIR_DATA','D:/wwwData/upload');


set_time_limit(0);



switch ($_POST['act']) {
    case 'init':
        init();
        break;
    case 'save_chunk':
        save_chunk();
        break;
    case 'merge':
        merge();
        break;
}





/**
 * 初始化，新建一个临时文件夹
 *
 * @return json
 */
function init(){

    session_start();

    $result = [];
    $uuid = $_POST['uuid'];
    
    $tmp_dirname = DIR_TMP.'/'.$uuid;
    is_dir($tmp_dirname) || mkdir($tmp_dirname,0777,true);

    $_SESSION[$uuid] = [];

    $result['status'] = 1;
    echo json_encode($result);

}



/**
 * 合并分片
 *
 * @return json
 */
function merge(){

    @session_start();

    $result = [];

    // 文件的uuid
    $uuid = $_POST['uuid'];

    // 前端计算好发来的文件分片MD5的整合MD5
    $post_md5 = $_POST['file_md5'];

    // 文件名
    $name = $_POST['filename'];

    // 分片总数
    $total_part = $_POST['totalparts'];

    // 存储在session中的MD5数组
    $md5_arr = $_SESSION[$uuid];
    
    // 按照索引升序排列数组
    ksort($md5_arr);

    // php计算的MD5
    $file_md5 = md5( implode('',$md5_arr) );


    // 临时文件夹名
    $tmp_path = DIR_TMP.'/'.$uuid;

    // 扫描该文件夹下的文件，去除默认存在的两个点
    $chunks = scandir($tmp_path);
    foreach ($chunks as $key => $value) {
        if($value == '.' || $value == '..') unset($chunks[$key]);
    }

    // 如果分片数量与前端发来的分片总数相同且两者计算出的MD5相同则进行合并(注：此MD5无法作为文件唯一标识，因为它是由该文件所有分片的MD5拼接再计算出来的MD5)
    if(count($chunks) == $total_part && $file_md5 == $post_md5){

        // 把数组按数字升序排列
        sort($chunks,SORT_NUMERIC);

        // 最终文件路径及文件名
        $filename = iconv('UTF-8','GBK',DIR_DATA.'/'.$name);

        // 打开文件,上锁，逐个分片扫描，依次写入
        $fp = fopen($filename,'ab');
        if(flock($fp, LOCK_EX)){

            foreach ($chunks as $key => $value) {
                $tmp_filename = $tmp_path.'/'.$value;
                $bin = file_get_contents($tmp_filename);
                fwrite($fp,$bin);
                unlink($tmp_filename);  // 删除已读取完的分片
            }

        }
        // 释放锁,关闭资源
        flock($fp, LOCK_UN);
        fclose($fp);

        // 删除对应的文件夹
        del_dir($tmp_path);

        $result['status'] = 1;
        echo json_encode($result);

    // 分片数量不符号，另作处理
    }else{
        // 删除对应的文件夹
        del_dir($tmp_path);
        $result['status'] = 0;
        echo json_encode($result);
    }

}



/**
 * 接收分片
 *
 * @return void
 */
function save_chunk(){
    
    session_start();

    // 当前分块的索引，作为块的文件名
    $part_index = $_POST['qqpartindex'];

    // 系统默认临时文件夹的位置，并把 \ 斜线转换成 / 斜线
    $tmp_path = str_replace(DIRECTORY_SEPARATOR,'/',$_FILES['qqfile']['tmp_name']);
    
    // 该文件的uuid
    $uuid = $_POST['qquuid'];

    // 指定的临时目录
    $uuid_dir = DIR_TMP.'/'.$uuid;

    // 指定的位置，文件名以当前分片的索引命名
    $uuid_path = $uuid_dir.'/'.$part_index;

    // 记录当前分片的MD5值
    $_SESSION[$uuid][$part_index] = md5_file($tmp_path);

    // 将上传来的文件移动到新位置    
    rename($tmp_path,$uuid_path);
    
    // 前端插件规定的返回值
    echo '{"success":true}';

}




/**
 * 删除文件夹，及其下的文件
 *
 * @param [字符串：文件夹名] $dirname
 * @return 无
 */
function del_dir($dirname){
    if(is_dir($dirname)){
        $dir = scandir($dirname);
        foreach ($dir as $key => $value) {
            if($value == '.' || $value == '..') continue;
            if(!unlink($dirname.'/'.$value)) continue;
        }
        rmdir($dirname);
    }
}



/**
 * 取文件的开头10M，中间10M，末尾10M，分别计算出他们的MD5再拼接起来算一次MD5
 *
 * @param [字符串] $filename 文件名
 * @return void
 */
function reckon_file_md5($filename){

    // 读取长度
    $i = 10*1024*1024;
    $size = filesize($filename);

    // 大于30M则分开计算
    if($size > $i*3){

        $fp = fopen($filename,'rb');

        if(flock($fp, LOCK_EX)){

            fseek($fp,0);
            $front = fread($fp,$i);
            
            fseek($fp,$size/2);
            $middle = fread($fp,$i);
            
            fseek($fp,$size-$i);
            $end = fread($fp,$i);

        }

        flock($fp, LOCK_UN);
        fclose($fp);

        $md5_front = md5($front);
        $md5_middle = md5($middle);
        $md5_end = md5($end);
        $m_md5 = md5($md5_front.$md5_middle.$md5_end);

    }else{
        // 小于30M直接计算
        $m_md5 = md5_file($filename);
    }

    return $m_md5;
}