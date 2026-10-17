import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGulfCup27Finalization } from '../../src/lib/gulfCup27FinalizationPolicy.ts';

const ids = Array.from({length:12},(_,i)=>`g27-group-${i+1}`).concat(['g27-sf-1','g27-sf-2','g27-final']);
function complete() { return ids.map(id=>({id,tournamentId:'gulf27',status:'finished',calculationStatus:'calculated',homeTeamId:'ksa',awayTeamId:'oma',result:{homeScore:2,awayScore:1,qualifiedTeamId:id==='g27-final'?'ksa':null,qualificationMethod:id==='g27-final'?'regular':null}})); }
test('closes only with all 15 scored matches and champion',()=>assert.deepEqual(evaluateGulfCup27Finalization(complete(),ids),{ready:true,championTeamId:'ksa',matchCount:15}));
test('does not close on final alone',()=>assert.equal(evaluateGulfCup27Finalization(complete().filter(m=>m.id==='g27-final'),ids).ready,false));
test('does not close with missing group match',()=>assert.equal(evaluateGulfCup27Finalization(complete().slice(1),ids).ready,false));
test('does not close with pending match',()=>{const matches=complete();matches[3].calculationStatus='not_calculated';assert.equal(evaluateGulfCup27Finalization(matches,ids).ready,false)});
test('does not close without champion',()=>{const matches=complete();matches.at(-1).result.qualifiedTeamId=null;assert.equal(evaluateGulfCup27Finalization(matches,ids).ready,false)});
test('does not close with unrecognized champion',()=>{const matches=complete();matches.at(-1).result.qualifiedTeamId='bhr';assert.equal(evaluateGulfCup27Finalization(matches,ids).ready,false)});
test('does not close with uncalculated result despite finished status',()=>{const matches=complete();matches[0].result.homeScore=null;assert.equal(evaluateGulfCup27Finalization(matches,ids).ready,false)});
test('does not close if an extra match is pending',()=>{const matches=complete();matches.push({...matches[0],id:'extra'});assert.equal(evaluateGulfCup27Finalization(matches,ids).ready,false)});
test('does not close with invalid expected schedule',()=>assert.equal(evaluateGulfCup27Finalization(complete(),ids.slice(0,-1)).ready,false));
