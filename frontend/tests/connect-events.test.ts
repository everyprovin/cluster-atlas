import {beforeEach,expect,it,vi} from 'vitest';
const sdk=vi.hoisted(()=>({write:vi.fn()}));
vi.mock('genlayer-js',async original=>({...await original<typeof import('genlayer-js')>(),createClient:()=>({writeContract:sdk.write})}));
import {WalletSession,type Pending} from '../src/wallet';

const account='0x'+'b'.repeat(40),other='0x'+'c'.repeat(40),address='0x'+'a'.repeat(40);
class Provider{
 chain:unknown='0xf22f';accounts:unknown=[account];approved:unknown=[account];switchWorks=true;
 requests:string[]=[];listeners=new Map<string,(payload:unknown)=>void>();
 readAccounts:(()=>Promise<unknown>)|undefined;
 on(event:string,callback:(payload:unknown)=>void){this.listeners.set(event,callback);}
 emit(event:string,payload:unknown){this.listeners.get(event)?.(payload);}
 async request({method}:{method:string}){this.requests.push(method);
  if(method==='eth_requestAccounts')return this.approved;
  if(method==='eth_accounts')return this.readAccounts?await this.readAccounts():this.accounts;
  if(method==='eth_chainId')return this.chain;
  if(method==='wallet_switchEthereumChain'){if(this.switchWorks)this.chain='0xf22f';return null;}
  throw Error('Unexpected provider request: '+method);
 }
}
const saved={address:address as `0x${string}`,account,chainId:61999,recordId:'demo',method:'derive',hash:null} satisfies Pending;
function make(){const provider=new Provider(),changed=vi.fn(),stored=new Map<string,string>(),storage={getItem:(k:string)=>stored.get(k)??null,setItem:(k:string,v:string)=>{stored.set(k,v);},removeItem:(k:string)=>{stored.delete(k);}};const wallet=new WalletSession(()=>provider,()=>{},storage);wallet.subscribe(changed);return {provider,wallet,changed,stored};}
beforeEach(()=>{vi.clearAllMocks();});

it('connects on the intended chain without requesting a redundant wallet switch',async()=>{const {provider,wallet}=make();expect(await wallet.connect()).toBe(account);expect(provider.requests).not.toContain('wallet_switchEthereumChain');expect(provider.requests).toContain('eth_accounts');expect(provider.requests.filter(v=>v==='eth_chainId')).toHaveLength(2);});
it('still requests one normal chain switch when needed and verifies the final context',async()=>{const {provider,wallet}=make();provider.chain='0x1';expect(await wallet.connect()).toBe(account);expect(provider.requests.filter(v=>v==='wallet_switchEthereumChain')).toHaveLength(1);});
it.each([['chainChanged','0xf22f'],['chainChanged','0xF22F'],['accountsChanged',[account.toUpperCase().replace('0X','0x')]]])('keeps a verified account for a delayed unchanged %s event',async(event,payload)=>{const {provider,wallet,changed}=make();await wallet.connect();provider.emit(event as string,payload);expect(wallet.account).toBe(account);expect(changed).not.toHaveBeenCalled();});
it.each([['accountsChanged',[other]],['accountsChanged',[]],['accountsChanged',[account,other]],['accountsChanged',[account,42]],['accountsChanged',null],['accountsChanged',{0:account}],['chainChanged','0x1'],['chainChanged',61999],['chainChanged','61999'],['chainChanged','0xf22fgarbage'],['chainChanged',null],['chainChanged',undefined]])('invalidates genuine or malformed %s context without losing pending metadata: %j',async(event,payload)=>{const {provider,wallet,changed,stored}=make();await wallet.connect();wallet.pending={...saved};stored.set('original',JSON.stringify(saved));const before=JSON.stringify(wallet.pending),storageBefore=JSON.stringify([...stored]);provider.emit(event as string,payload);expect(wallet.account).toBe('');expect(changed).toHaveBeenCalledTimes(1);expect(JSON.stringify(wallet.pending)).toBe(before);expect(JSON.stringify([...stored])).toBe(storageBefore);await expect(wallet.act(address,'demo','derive',['demo',0])).rejects.toThrow('pending');expect(sdk.write).not.toHaveBeenCalled();});
it('does not adopt a different account returned after initial permission approval',async()=>{const {provider,wallet}=make();provider.accounts=[other];await expect(wallet.connect()).rejects.toThrow(/account|context/i);expect(wallet.account).toBe('');});
it('rejects a switch whose final chain is still wrong',async()=>{const {provider,wallet}=make();provider.chain='0x1';provider.switchWorks=false;await expect(wallet.connect()).rejects.toThrow(/network|context/i);expect(wallet.account).toBe('');});
it.each([true,61999,'61999',null,'0xf22fgarbage'])('fails closed on malformed initial chain %j without requesting a switch',async chain=>{const {provider,wallet}=make();provider.chain=chain;await expect(wallet.connect()).rejects.toThrow(/network|context/i);expect(wallet.account).toBe('');expect(provider.requests).not.toContain('wallet_switchEthereumChain');});
it.each([[],[account,42],null])('rejects malformed final account evidence %j',async accounts=>{const {provider,wallet}=make();provider.accounts=accounts;await expect(wallet.connect()).rejects.toThrow(/account|context/i);expect(wallet.account).toBe('');});
it('does not restore cached identity after a meaningful event during final context reads',async()=>{const {provider,wallet,changed}=make();provider.readAccounts=async()=>{provider.emit('accountsChanged',[other]);return [account];};await expect(wallet.connect()).rejects.toThrow(/context|account/i);expect(wallet.account).toBe('');expect(changed).toHaveBeenCalledTimes(1);});
it('a real account event blocks a fresh business submission before SDK invocation',async()=>{const {provider,wallet}=make();await wallet.connect();provider.accounts=[other];provider.emit('accountsChanged',[other]);await expect(wallet.act(address,'demo','derive',['demo',0])).rejects.toThrow(/Connect|account/);expect(sdk.write).not.toHaveBeenCalled();expect(wallet.pending).toBeNull();});
it('before-write guard rejects an unannounced chain change even when no event is delivered',async()=>{const {provider,wallet}=make();await wallet.connect();provider.chain='0x1';await expect(wallet.act(address,'demo','derive',['demo',0])).rejects.toThrow('network');expect(sdk.write).not.toHaveBeenCalled();});
it('preserves the original persisted unknown submission across invalidation and same-tab recovery',async()=>{const stored=new Map([['cluster-atlas:pending:v1',JSON.stringify(saved)]]),storage={getItem:(k:string)=>stored.get(k)??null,setItem:(k:string,v:string)=>{stored.set(k,v);},removeItem:(k:string)=>{stored.delete(k);}},provider=new Provider(),wallet=new WalletSession(()=>provider,()=>{},storage);wallet.subscribe(()=>{});await wallet.connect();const before=JSON.stringify([...stored]);provider.emit('chainChanged','0x1');expect(wallet.pending).toEqual(saved);expect(JSON.stringify([...stored])).toBe(before);const recovered=new WalletSession(()=>provider,()=>{},storage);expect(recovered.pending).toEqual(saved);await expect(recovered.act(address,'demo','derive',['demo',0])).rejects.toThrow('pending');expect(sdk.write).not.toHaveBeenCalled();});
