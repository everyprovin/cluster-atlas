import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {getAddress} from 'viem';
import {TransactionStatus,transactionsStatusNumberToName,transactionResultNumberToName,executionResultNumberToName} from 'genlayer-js/types';
import type {CalldataEncodable,GenLayerTransaction,TransactionHash} from 'genlayer-js/types';
export type Dict=Record<string,unknown>;
type Provider={request(args:{method:string;params?:unknown[]}):Promise<unknown>;on?:(event:string,callback:(payload:unknown)=>void)=>void};
type SDKProvider=NonNullable<NonNullable<Parameters<typeof createClient>[0]>['provider']>;
type Store={getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void};
export type Pending={address:`0x${string}`;account:string;chainId:number;recordId:string;method:string;hash:`0x${string}`|null};
const key='cluster-atlas:pending:v1',hashPattern=/^0x[0-9a-fA-F]{64}$/;
function object(value:unknown):Dict{if(value===null||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))throw Error('Expected decoded dictionary.');return value as Dict;}
function defaultStore():Store|undefined{try{return typeof window==='undefined'?undefined:window.sessionStorage;}catch{return undefined;}}
function walletAccounts(value:unknown):string[]|null{if(!Array.isArray(value)||!value.length||!value.every(v=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v)))return null;return value.map(v=>(v as string).toLowerCase());}
function walletChain(value:unknown):number|null{if(typeof value!=='string'||!/^0x[0-9a-fA-F]+$/.test(value))return null;const chain=Number(value);return Number.isSafeInteger(chain)?chain:null;}
export function assertTarget(address:string,chain=studionet.id):asserts address is `0x${string}`{if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/i.test(address))throw Error('Enter an actual deployment address.');if(chain!==studionet.id)throw Error('Wallet network must be Stable Studio 61999.');}
export function lockArgs(id:string,url:string,sha:string):[string,string,string]{
 if(!/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(id))throw Error('Record ID must be 1..24 ASCII identifier characters.');
 if(url.length>512||!/^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}\/[0-9a-f]{40}\/[A-Za-z0-9_.~/-]+$/.test(url)||url.split('/').slice(3).some(p=>!p||p==='.'||p==='..')||!url.endsWith('/profile05/projects/cluster-atlas/fixtures/metric.json'))throw Error('Use an immutable commit-pinned source in this project fixture namespace.');
 if(!/^[0-9a-f]{64}$/.test(sha))throw Error('SHA256 must be 64 lowercase hex characters.');return [id,url,sha];
}
function zero(value:unknown){return value===0||value===0n||value==='0'||value==='0x0';}
function publicReceipt(value:unknown,sdk=false):Dict{
 const r=object(value),out:Dict={},fields=sdk?['hash','txId','from_address','sender','to_address','recipient','value','status','statusName','execution_mode','leader_only','result_name','resultName','result','txExecutionResult','txExecutionResultName']:['hash','from_address','to_address','value','status','execution_mode','leader_only','result_name'];
 for(const field of fields){const v=r[field];if(v!==undefined&&(v===null||['string','number','bigint','boolean'].includes(typeof v)))out[field]=v;}
 if(sdk&&r.lifecycle!==undefined)out.lifecycle={state:object(r.lifecycle).state};
 const consensus=r.consensus_data;if(consensus&&typeof consensus==='object'&&!Array.isArray(consensus)){const entries=(consensus as Dict).leader_receipt;if(Array.isArray(entries))out.consensus_data={leader_receipt:entries.filter(e=>e&&typeof e==='object'&&e.mode==='leader').map(e=>({mode:e.mode,execution_result:e.execution_result}))};}
 return out;
}
export function assertRawTransaction(value:unknown,p:Pending):void{
 const r=object(value);
 if(r.status!=='FINALIZED'||r.execution_mode!=='NORMAL'||r.leader_only!==false||r.result_name!=='MAJORITY_AGREE')throw Error('Raw RPC lacks FINALIZED NORMAL majority consensus; pending retained.');
 if(typeof r.hash!=='string'||r.hash.toLowerCase()!==p.hash?.toLowerCase()||typeof r.from_address!=='string'||r.from_address.toLowerCase()!==p.account.toLowerCase()||typeof r.to_address!=='string'||r.to_address.toLowerCase()!==p.address.toLowerCase()||!zero(r.value))throw Error('Raw RPC transaction binding or zero value mismatch; pending retained.');
 const entries=object(r.consensus_data).leader_receipt;if(!Array.isArray(entries))throw Error('Missing raw leader evidence; pending retained.');
 const leaders=entries.map(object).filter(e=>e.mode==='leader');if(leaders.length!==1||leaders[0].execution_result!=='SUCCESS')throw Error('Exactly one successful current leader is required; pending retained.');
}
function assertSDK(receipt:GenLayerTransaction|undefined,p:Pending):void{
 if(!receipt)return;const r=receipt as unknown as Dict;
 if(r.status!==undefined){const status=typeof r.status==='number'?(transactionsStatusNumberToName as Record<string,string>)[String(r.status)]:r.status;if(status!=='FINALIZED')throw Error('SDK stored status conflicts; pending retained.');}
 if(r.resultName!==undefined&&r.resultName!=='MAJORITY_AGREE')throw Error('SDK majority result conflicts; pending retained.');
 if(r.result_name!==undefined&&r.result_name!=='MAJORITY_AGREE')throw Error('SDK raw-style majority result conflicts; pending retained.');
 if(r.result!==undefined&&(transactionResultNumberToName as Record<string,string>)[String(r.result)]!=='MAJORITY_AGREE')throw Error('SDK majority result conflicts; pending retained.');
 if(r.execution_mode!==undefined&&r.execution_mode!=='NORMAL'||r.leader_only!==undefined&&r.leader_only!==false)throw Error('SDK execution mode conflicts; pending retained.');
 if((r.lifecycle!==undefined&&object(r.lifecycle).state!=='finalized')||(receipt.statusName!==undefined&&receipt.statusName!=='FINALIZED'))throw Error('SDK finality conflicts with raw proof; pending retained.');
 for(const field of ['hash','txId'])if(r[field]!==undefined&&(typeof r[field]!=='string'||(r[field] as string).toLowerCase()!==p.hash?.toLowerCase()))throw Error('SDK transaction hash conflicts; pending retained.');
 for(const field of ['from_address','sender'])if(r[field]!==undefined&&(typeof r[field]!=='string'||(r[field] as string).toLowerCase()!==p.account.toLowerCase()))throw Error('SDK sender conflicts; pending retained.');
 for(const field of ['to_address','recipient'])if(r[field]!==undefined&&(typeof r[field]!=='string'||(r[field] as string).toLowerCase()!==p.address.toLowerCase()))throw Error('SDK target conflicts; pending retained.');
 if(r.value!==undefined&&!zero(r.value))throw Error('SDK value conflicts; pending retained.');
 if(receipt.txExecutionResult!==undefined&&(executionResultNumberToName as Record<string,string>)[String(receipt.txExecutionResult)]!=='FINISHED_WITH_RETURN')throw Error('SDK numeric execution conflicts or is unknown; pending retained.');
 if(receipt.txExecutionResultName!==undefined&&receipt.txExecutionResultName!=='FINISHED_WITH_RETURN')throw Error('SDK named execution conflicts or is unknown; pending retained.');
 const execution=receipt.txExecutionResultName??(receipt.txExecutionResult===undefined?undefined:(executionResultNumberToName as Record<string,string>)[String(receipt.txExecutionResult)]);
 if(execution!==undefined&&execution!=='FINISHED_WITH_RETURN')throw Error('SDK execution conflicts with successful raw leader; pending retained.');
 // Stable SDK1.1.8 has no isSuccessful export. Available fields are checked above;
 // missing fields remain missing and independent raw consensus proof is mandatory.
 const supplied=receipt.consensus_data?.leader_receipt;if(supplied!==undefined){if(!Array.isArray(supplied))throw Error('SDK leader shape conflicts; pending retained.');const leaders=supplied.filter(v=>v.mode==='leader');if(leaders.length!==1||leaders.some(v=>v.execution_result!=='SUCCESS'))throw Error('SDK leader execution conflicts; pending retained.');}
 // Missing Studio fields remain missing. Numeric zero lost by viem is not synthesized.
}
export class WalletSession{
 account='';pending:Pending|null=null;evidence:unknown=null;private working=false;private invalidSaved=false;private contextVersion=0;private knownChain:number|null=null;private knownAccounts:string[]=[];
 constructor(private getProvider:()=>Provider=()=>{const p=(window as unknown as {ethereum?:Provider}).ethereum;if(!p)throw Error('MetaMask is required for testnet signing.');return p;},private report:(message:string)=>void=()=>{},private storage:Store|undefined=defaultStore()){
  try{const saved=this.storage?.getItem(key);if(saved){const p=JSON.parse(saved);assertTarget(p.address,p.chainId);if(!/^0x[0-9a-fA-F]{40}$/.test(p.account)||!/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(p.recordId)||!['lock_source','derive','confirm','revoke'].includes(p.method)||(p.hash!==null&&!hashPattern.test(p.hash)))throw Error('saved pending');this.pending=p;}}
  catch{this.invalidSaved=true;this.report('Saved pending context is invalid. Inspect wallet activity before any new submission.');}
 }
 private save(){try{if(this.pending)this.storage?.setItem(key,JSON.stringify(this.pending));else this.storage?.removeItem(key);}catch{this.report('Session storage unavailable; retain the transaction ID before leaving this page.');}}
 dropAccount(){this.account='';this.knownChain=null;this.knownAccounts=[];this.contextVersion++;}
 async connect(){this.dropAccount();const p=this.getProvider(),approved=walletAccounts(await p.request({method:'eth_requestAccounts'}));if(!approved)throw Error('Wallet account unavailable.');
  const initialChain=walletChain(await p.request({method:'eth_chainId'}));if(initialChain===null)throw Error('Wallet network context is malformed.');
  if(initialChain!==studionet.id){try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+studionet.id.toString(16)}]});}catch(error){if((error as {code?:number}).code!==4902)throw error;await p.request({method:'wallet_addEthereumChain',params:[{chainId:'0x'+studionet.id.toString(16),chainName:studionet.name,nativeCurrency:studionet.nativeCurrency,rpcUrls:[...studionet.rpcUrls.default.http]}]});}}
  const version=this.contextVersion,chain=walletChain(await p.request({method:'eth_chainId'})),accounts=walletAccounts(await p.request({method:'eth_accounts'}));
  if(version!==this.contextVersion||this.getProvider()!==p||chain!==studionet.id||!accounts||accounts[0]!==approved[0])throw Error('Wallet account or network context changed during connection. Reconnect the intended original account.');
  this.knownChain=chain;this.knownAccounts=accounts;this.account=accounts[0];return this.account;
 }
 subscribe(callback:()=>void){try{const p=this.getProvider();p.on?.('accountsChanged',payload=>{const accounts=walletAccounts(payload);if(this.account&&this.knownChain===studionet.id&&accounts&&accounts.length===this.knownAccounts.length&&accounts.every((a,i)=>a===this.knownAccounts[i]))return;this.dropAccount();callback();});p.on?.('chainChanged',payload=>{const chain=walletChain(payload);if(this.account&&chain===studionet.id&&this.knownChain===chain)return;this.dropAccount();callback();});}catch{}}
 private async guard(address:string,account=this.account){assertTarget(address);if(!account)throw Error('Connect your wallet account first.');const p=this.getProvider();assertTarget(address,Number(await p.request({method:'eth_chainId'})));const values=await p.request({method:'eth_accounts'});if(!Array.isArray(values)||typeof values[0]!=='string'||values[0].toLowerCase()!==account.toLowerCase()||this.account.toLowerCase()!==account.toLowerCase())throw Error('Wallet account changed; reconnect original account.');return p;}
 async read(address:string,recordId:string):Promise<Dict>{assertTarget(address);return object(await createClient({chain:studionet}).readContract({address:getAddress(address),functionName:'get_record',args:[recordId]}));}
 async act(address:string,recordId:string,method:string,args:CalldataEncodable[]):Promise<Dict>{
  if(this.pending||this.working||this.invalidSaved)throw Error('A transaction is pending or its outcome is unknown; observe it without resending.');this.working=true;
  try{const provider=await this.guard(address);assertTarget(address);if(!/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(recordId)||!['lock_source','derive','confirm','revoke'].includes(method)||args[0]!==recordId)throw Error('Invalid action record context.');
   const p:Pending={address,account:this.account,chainId:studionet.id,recordId,method,hash:null};this.pending=p;this.save();let hash:unknown,submitted=false,firstRejected=false;
   const signingProvider:Provider={request:async request=>{
    if(request.method==='eth_accounts'||request.method==='eth_chainId')return provider.request(request);
    if(request.method!=='eth_sendTransaction')throw Error('Unexpected wallet operation blocked by submission guard.');
    if(submitted)throw Error('Only one wallet submission is permitted. Preserve the original outcome and inspect wallet activity.');
    submitted=true;const current=await this.guard(address,p.account);if(current!==provider)throw Error('Wallet provider changed before submission.');
    try{return await provider.request(request);}catch(error){firstRejected=(error as {code?:number}).code===4001;throw error;}
   }};
   try{hash=await createClient({chain:studionet,account:p.account as `0x${string}`,provider:signingProvider as SDKProvider}).writeContract({address:getAddress(address),functionName:method,args,value:0n});}catch(error){if(firstRejected){this.pending=null;this.save();}throw error;}
   if(typeof hash!=='string'||!hashPattern.test(hash))throw Error('Submission outcome unknown without a valid hash. Do not resend.');p.hash=hash as `0x${string}`;this.save();this.report('Submitted '+hash);return await this.observe();
  }finally{this.working=false;}
 }
 private async observe():Promise<Dict>{const p=this.pending;if(!p?.hash)throw Error('Submission hash unavailable; inspect wallet activity and attach the exact hash.');const client=createClient({chain:studionet});let receipt:GenLayerTransaction|undefined;
  // SDK1.1.8 runtime supports fullTransaction; its published client type omits it.
  const options={hash:p.hash as TransactionHash,status:TransactionStatus.FINALIZED,fullTransaction:true,interval:5000,retries:120};
  try{receipt=await client.waitForTransactionReceipt(options);}catch{this.report('SDK observation unavailable; checking exact public raw RPC evidence.');}
  const raw=await client.request({method:'eth_getTransactionByHash',params:[p.hash as TransactionHash]});assertRawTransaction(raw,p);assertSDK(receipt,p);this.evidence={hash:p.hash,raw:publicReceipt(raw),sdk:receipt===undefined?null:publicReceipt(receipt,true)};
  const record=await this.read(p.address,p.recordId);this.pending=null;this.save();this.report('FINALIZED / MAJORITY_AGREE / unique leader SUCCESS '+p.hash);return record;
 }
 attachHash(hash:string){if(!this.pending||this.pending.hash!==null||!hashPattern.test(hash))throw Error('Attach a valid exact hash only to an unresolved submission.');this.pending.hash=hash as `0x${string}`;this.save();}
 async resume():Promise<Dict>{if(this.working)throw Error('Transaction observation pending.');const p=this.pending;if(!p)throw Error('No pending transaction to observe.');this.working=true;try{await this.guard(p.address,p.account);return await this.observe();}finally{this.working=false;}}
}
