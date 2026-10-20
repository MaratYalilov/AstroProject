import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID, randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import {createCredentials, verifyPassword} from '../src/lib/feedback/credentials.mjs';
import {feedbackDataDir} from '../src/lib/feedback/paths.mjs';
const require=createRequire(import.meta.url);
function load(file){const code=buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;const module={exports:{}};new Function('module','exports','require',code)(module,module.exports,require);return module.exports;}
const store=load('src/lib/feedback/store.ts');
const auth=load('src/lib/feedback/auth.ts');
const validation=load('src/lib/feedback/validation.ts');
const http=load('src/lib/feedback/http.ts');
const previous=process.env.FEEDBACK_DATA_DIR;
const dir=path.resolve('.data/feedback-unit-'+randomUUID());
process.env.FEEDBACK_DATA_DIR=dir;
try{
 await fs.mkdir(dir,{recursive:true,mode:0o700});
 const password=randomBytes(24).toString('base64url');const credentials=await createCredentials(password);
 assert.notEqual(credentials.hash,password);assert.ok(await verifyPassword(password,credentials));assert.equal(await verifyPassword('wrong',credentials),false);
 await fs.writeFile(path.join(dir,'admin.json'),JSON.stringify(credentials),{mode:0o600});
 const token=await auth.createAdminSession(credentials);const session=await auth.adminSession(token);assert.ok(session);assert.ok(auth.validCsrf(session.csrf,session));assert.equal(auth.validCsrf('wrong',session),false);assert.equal(await auth.adminSession(token+'x'),null);assert.equal(await auth.adminSession(token,Date.now()+9*3600000),null);
 await auth.destroyAdminSession(token);assert.equal(await auth.adminSession(token),null,'logout revokes the token');
 const token2=await auth.createAdminSession(credentials);await fs.writeFile(path.join(dir,'admin.json'),JSON.stringify(await createCredentials(password)));assert.equal(await auth.adminSession(token2),null,'password reset revokes all previous sessions');
 assert.equal(validation.normalizeFeedbackUrl('javascript:alert(1)','https://hutba.org'),null);assert.equal(validation.normalizeFeedbackUrl('https://other.test/lesson','https://hutba.org'),null);assert.equal(validation.normalizeFeedbackUrl('https://u:p@hutba.org/lesson','https://hutba.org'),null);assert.equal(validation.normalizeFeedbackUrl('/lesson?slug=a#term=x','https://hutba.org'),'https://hutba.org/lesson?slug=a#term=x');
 const form=new URLSearchParams({pageUrl:'https://hutba.org/lesson?slug=a',pageTitle:'Test lesson',message:'A reproducible test error.'});const input=validation.validateFeedback(form,'https://hutba.org');const report=await store.createFeedback(input);assert.equal(report.status,'new');assert.equal((await store.getFeedback(report.id)).message,input.message);assert.equal(await store.getFeedback('../../admin'),null);
 const updates=await Promise.allSettled([store.updateFeedback(report.id,'in_progress','Internal note',1),store.updateFeedback(report.id,'resolved','',1)]);assert.equal(updates.filter(r=>r.status==='fulfilled').length,1);const changed=await store.getFeedback(report.id);assert.equal(changed.version,2);assert.equal(changed.notes.length,1);await store.updateFeedback(report.id,'resolved','Fixed',2);assert.equal((await store.listFeedback())[0].status,'resolved');
 for(const bad of ['public/private','dist/client/private','../assets/private','src/private','public/..reports','../assets/..private','..other/feedback']){process.env.FEEDBACK_DATA_DIR=bad;assert.throws(()=>feedbackDataDir());}process.env.FEEDBACK_DATA_DIR=dir;
 const request=(body,origin='https://hutba.org')=>new Request('https://hutba.org/feedback/bug',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body});
 assert.doesNotThrow(()=>http.requireSameOrigin(request('a=b')));assert.throws(()=>http.requireSameOrigin(request('a=b','https://other.test')));assert.equal((await http.readFeedbackForm(request('a=b'))).get('a'),'b');await assert.rejects(()=>http.readFeedbackForm(request('a='+ 'x'.repeat(65000))),e=>e.status===413);
 const headers=new Headers();http.privateFeedbackHeaders(headers);assert.match(headers.get('Cache-Control'),/no-store/);assert.equal(headers.get('X-Frame-Options'),'DENY');assert.equal(http.feedbackClientKey(new Request('https://hutba.org',{headers:{'x-real-ip':'192.0.2.1'}}),'203.0.113.1'),'203.0.113.1');
 const rateKey=randomUUID();assert.ok(http.allowFeedbackRequest(rateKey,1,1000,0));assert.equal(http.allowFeedbackRequest(rateKey,1,1000,1),false);assert.ok(http.allowFeedbackRequest(rateKey,1,1000,1001));
 console.log('PASS: password hashes, revocable/expired/tampered sessions, reset, CSRF, private paths, URL validation, persistence, concurrent edits, notes, body limit, rate limit and headers. No project build.');
}finally{if(previous===undefined)delete process.env.FEEDBACK_DATA_DIR;else process.env.FEEDBACK_DATA_DIR=previous;await fs.rm(dir,{recursive:true,force:true});}
