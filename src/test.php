<?php
// define('DIR_TMP',str_replace(DIRECTORY_SEPARATOR,'/',__DIR__.'\tmp'));


// // $filename = DIR_TMP.'/test.mp4';
// $filename = 'tmp/test.rar';
// $filename = iconv('UTF-8','GBK',$filename);


// var_dump(reckon_file_md5($filename));


set_time_limit(0);

// echo 'post:';
// var_dump($_POST);
// echo '--------------------';
// echo 'get:';
// var_dump($_GET);
// echo 'files:';
// echo '--------------------';
// var_dump($_FILES);

// // $result['status'] = 1; 








// exit;

// @rename($_FILES['qqfile']['tmp_name'],DIR_TMP.'/'.$_POST['qqpartindex']);

// echo '{"success":"true"}';

// // var_dump($_FILES);

// // rename($_FILES['qqfile']['tmp_name'],DIR_TMP.'/233.txt');


// /**
//  * 取文件的开头10M，中间10M，末尾10M，分别计算出他们的MD5再拼接起来算一次MD5
//  *
//  * @param [字符串] $filename 文件名
//  * @return void
//  */
// function reckon_file_md5($filename){

//     // 读取长度
//     $i = 10*1024*1024;
//     $size = filesize($filename);

//     // 大于30M则分开计算
//     if($size > $i*3){

//         $fp = fopen($filename,'rb');

//         if(flock($fp, LOCK_EX)){

//             fseek($fp,0);
//             $front = fread($fp,$i);
            
//             fseek($fp,$size/2);
//             $middle = fread($fp,$i);
            
//             fseek($fp,$size-$i);
//             $end = fread($fp,$i);

//         }

//         flock($fp, LOCK_UN);
//         fclose($fp);

//         $md5_front = md5($front);
//         $md5_middle = md5($middle);
//         $md5_end = md5($end);
//         $m_md5 = md5($md5_front.$md5_middle.$md5_end);

//     }else{
//         // 小于30M直接计算
//         $m_md5 = md5_file($filename);
//     }

//     return $m_md5;
// }