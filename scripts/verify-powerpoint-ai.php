<?php
declare(strict_types=1);
require dirname(__DIR__) . '/public/ilaw-powerpoint-ai.php';
function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function rejects(callable $operation, string $message): void {
    try { $operation(); } catch (InvalidArgumentException | RuntimeException $expected) { return; }
    throw new RuntimeException($message);
}
$slots = [
    ['number'=>1,'kind'=>'content','focus'=>'Explain a relevant lesson concept.','quizNumbers'=>[]],
    ['number'=>2,'kind'=>'quiz','focus'=>'Check the taught concept.','quizNumbers'=>[1]],
    ['number'=>3,'kind'=>'situation','focus'=>'REAL-LIFE SITUATION','quizNumbers'=>[]],
];
$input = ['context'=>['grade'=>9,'subject'=>'Good Manners and Right Conduct','term'=>2,'week'=>3,'title'=>'Pananagutan','competencies'=>[['text'=>'Naipaliliwanag ang pananagutan sa pamayanan.']]],'slots'=>$slots];
$spec = ilaw_powerpoint_spec($input);
check($spec['numbers'] === [1,2,3], 'Slide numbers were changed.');
check(in_array('scenario', $spec['schema']['properties']['slides']['items']['required'], true), 'Scenario must be part of the structured-output schema.');
check(str_contains($spec['rules'], 'REAL-LIFE SITUATION'), 'Rules must describe the real-life situation slide.');
check($spec['schema']['properties']['slides']['items']['properties']['questions']['items']['properties']['correctAnswer']['enum'] === ['A','B','C','D'], 'Answer schema must use exactly A-D.');
rejects(fn()=>ilaw_powerpoint_spec(array_replace_recursive($input,['context'=>['grade'=>6]])), 'Invalid grade accepted.');
rejects(fn()=>ilaw_powerpoint_spec(array_replace_recursive($input,['context'=>['term'=>4]])), 'Invalid term accepted.');
rejects(fn()=>ilaw_powerpoint_spec(array_replace($input,['slots'=>[$slots[0],$slots[0]]])), 'Duplicate slots accepted.');
rejects(fn()=>ilaw_powerpoint_spec(array_replace($input,['slots'=>array_fill(0,6,$slots[0])])), 'More than five slides accepted.');
$result = ['slides'=>[
    ['number'=>1,'title'=>'Pananagutan','bullets'=>['Kilalanin ang iyong tungkulin.'],'visual'=>'','table'=>null,'notes'=>'Software test fixture.','questions'=>[],'scenario'=>null],
    ['number'=>2,'title'=>'Pagsusulit','bullets'=>[],'visual'=>'','table'=>null,'notes'=>'','questions'=>[['number'=>1,'question'=>'Alin ang nagpapakita ng pananagutan?','choices'=>['A'=>'Pagtupad sa tungkulin','B'=>'Pag-iwas sa tungkulin','C'=>'Pagsisi sa iba','D'=>'Pagbalewala sa gawain'],'correctAnswer'=>'A','rationale'=>'Pagtupad sa tungkulin ang wastong sagot.']],'scenario'=>null],
    ['number'=>3,'title'=>'Sitwasyon sa Totoong Buhay','bullets'=>[],'visual'=>'','table'=>null,'notes'=>'','questions'=>[],'scenario'=>['setting'=>'Barangay clean-up drive','story'=>'Nakita ni Paolo na walang naglilinis ng kanal sa kanilang kalye bago tag-ulan. Inanyayahan siya ng kapitan na tumulong sa Sabado.','questions'=>['Ano ang dapat gawin ni Paolo?','Paano ito nagpapakita ng pananagutan?']]],
]];
ilaw_validate_powerpoint_response($result,$slots);
$noStory = $result; $noStory['slides'][2]['scenario'] = null;
rejects(fn()=>ilaw_validate_powerpoint_response($noStory,$slots), 'Situation slide without a story accepted.');
$oneQuestion = $result; $oneQuestion['slides'][2]['scenario']['questions'] = ['Ano ang dapat gawin ni Paolo?'];
rejects(fn()=>ilaw_validate_powerpoint_response($oneQuestion,$slots), 'Situation slide with one guide question accepted.');
rejects(fn()=>ilaw_validate_powerpoint_response(['slides'=>[$result['slides'][0]]],$slots), 'Partial response accepted.');
$invalid = $result;
$invalid['slides'][1]['questions'][0]['number'] = 2;
rejects(fn()=>ilaw_validate_powerpoint_response($invalid,$slots), 'Different quiz number accepted.');
$invalid['slides'][1]['questions'][0]['number'] = 1;
$invalid['slides'][1]['questions'][0]['correctAnswer'] = 'E';
rejects(fn()=>ilaw_validate_powerpoint_response($invalid,$slots), 'Invalid answer accepted.');
echo "PASS: PHP PowerPoint context, batch limits, structured-output schema, unique slots, real-life situation and quiz-response contract. No external provider was called.\n";
