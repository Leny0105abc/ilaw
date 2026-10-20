<?php
declare(strict_types=1);
ini_set('display_errors', '0');
require_once dirname(__DIR__) . '/ilaw-auth.php';
ilaw_require_auth($ilawAuth, true);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
function cot_reply(int $status, array $value): never {http_response_code($status);echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);exit;}
function cot_validate(array $rows): void {
    if(count($rows)>3000)throw new InvalidArgumentException('Indicator library is too large.');
    $positions=['Teacher I','Teacher II','Teacher III','Teacher IV','Teacher V','Teacher VI','Teacher VII','Master Teacher I','Master Teacher II','Master Teacher III'];
    $ids=[];$active=[];
    foreach($rows as $row){
        foreach(['id','schoolYear','position','careerStage','code','wording','domain','strand','observationType','source','sourceUrl','sourcePage','version'] as $field)if(!is_string($row[$field]??null)||trim($row[$field])===''||strlen($row[$field])>24000)throw new InvalidArgumentException('Complete every indicator field.');
        if(!in_array($row['position'],$positions,true)||!in_array($row['observationType'],['PMES','COT-RSP'],true)||!preg_match('/^20\d{2}-20\d{2}$/',$row['schoolYear'])||!preg_match('/^[1-7]\.[1-9]\.[1-4]$/',$row['code'])||!filter_var($row['sourceUrl'],FILTER_VALIDATE_URL)||!str_starts_with($row['sourceUrl'],'https://')||!is_bool($row['active']??null)||!is_bool($row['verified']??null)||!is_string($row['verifiedAt']??null)||!is_array($row['cycles']??null)||count($row['cycles'])<1||array_diff($row['cycles'],['1st','2nd']))throw new InvalidArgumentException('Invalid indicator metadata.');
        if(isset($ids[$row['id']]))throw new InvalidArgumentException('Duplicate indicator IDs.');$ids[$row['id']]=true;
        if($row['active']&&$row['verified'])foreach($row['cycles'] as $cycle){$key=$row['schoolYear'].'/'.$row['position'].'/'.$row['observationType'].'/'.$cycle.'/'.$row['code'];if(isset($active[$key]))throw new InvalidArgumentException('Overlapping active indicator versions.');$active[$key]=true;}
    }
}
$method=$_SERVER['REQUEST_METHOD']??'';
if(!in_array($method,['GET','POST'],true))cot_reply(405,['error'=>'Use GET or POST.']);
if($method==='POST'&&!ilaw_valid_post($ilawAuth,$_SERVER['HTTP_X_ILAW_CSRF']??''))cot_reply(403,['error'=>'Refresh ILAW and try again.']);
session_write_close();
$file=dirname(__DIR__,2).'/ilaw-cot-indicators.json';
$lock=fopen($file.'.lock','c+');
if(!$lock||!flock($lock,LOCK_EX))cot_reply(503,['error'=>'Indicator library is busy.']);
try{
    if(is_file($file)){$current=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);cot_validate($current['indicators']);}
    else{
        $seedRaw=file_get_contents(dirname(__DIR__).'/cot-indicator-seed.json');$seed=json_decode($seedRaw,true,32,JSON_THROW_ON_ERROR);$rows=[];
        foreach($seed['groups'] as $group)foreach($group['positions'] as $position)foreach($seed['rows'] as $row){$code=$row['prefix'].'.'.$group['suffix'];$rows[]=['id'=>'pmes-2026-27-'.str_replace(' ','-',$position).'-'.$code,'schoolYear'=>$seed['schoolYear'],'position'=>$position,'careerStage'=>$group['careerStage'],'code'=>$code,'wording'=>$row[$group['suffix']],'domain'=>$row['domain'],'strand'=>$row['strand'],'observationType'=>'PMES','cycles'=>$row['cycles'],'source'=>$seed['source'].'; wording source '.$seed['wordingSourceUrl'],'sourceUrl'=>$seed['sourceUrl'],'sourcePage'=>$seed['sourcePage'],'version'=>$seed['version'],'active'=>true,'verified'=>true,'verifiedAt'=>$seed['verifiedAt']];}
        cot_validate($rows);$current=['revision'=>'seed-'.substr(hash('sha256',$seedRaw),0,24),'indicators'=>$rows];
    }
    if($method==='POST'){
        if(stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0)cot_reply(415,['error'=>'Expected JSON.']);
        $raw=file_get_contents('php://input',false,null,0,4000001);if($raw===false||strlen($raw)>4000000)cot_reply(413,['error'=>'Library is too large.']);
        $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if(($input['revision']??'')!==$current['revision'])cot_reply(409,['error'=>'Another tab updated the library. Reload the library before saving.']);
        if(!is_array($input['indicators']??null))throw new InvalidArgumentException('Missing indicator records.');
        cot_validate($input['indicators']);$current=['revision'=>bin2hex(random_bytes(16)),'indicators'=>$input['indicators']];
        $tmp=$file.'.'.bin2hex(random_bytes(6)).'.tmp';
        if(file_put_contents($tmp,json_encode($current,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Write failed');
        chmod($tmp,0600);if(!rename($tmp,$file))throw new RuntimeException('Publish failed');
    }
    flock($lock,LOCK_UN);fclose($lock);cot_reply(200,$current);
}catch(InvalidArgumentException|JsonException $error){flock($lock,LOCK_UN);fclose($lock);cot_reply(400,['error'=>$error->getMessage()]);}
catch(Throwable $error){flock($lock,LOCK_UN);fclose($lock);cot_reply(503,['error'=>'The library could not be read or saved. Existing records were retained.']);}
