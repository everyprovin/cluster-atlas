export type VisibleContext={address:string;recordId:string};
type Token=VisibleContext&{epoch:number};
export class RecordContext{
 loaded:Record<string,unknown>|null=null;private accepted:VisibleContext|null=null;private epoch=0;
 constructor(private visible:()=>VisibleContext){}
 start():Token{const v=this.visible();return {address:v.address.toLowerCase(),recordId:v.recordId,epoch:this.epoch};}
 invalidate(){this.epoch++;this.loaded=null;this.accepted=null;}
 private matches(token:Token){const v=this.visible();return token.epoch===this.epoch&&token.address===v.address.toLowerCase()&&token.recordId===v.recordId;}
 async load(token:Token,promise:Promise<Record<string,unknown>>):Promise<boolean>{const record=await promise;if(!this.matches(token)||record.record_id!==token.recordId)return false;this.loaded=record;this.accepted={address:token.address,recordId:token.recordId};return true;}
 requireLoaded():Record<string,unknown>{const v=this.visible();if(!this.loaded||!this.accepted||this.accepted.address!==v.address.toLowerCase()||this.accepted.recordId!==v.recordId||this.loaded.record_id!==v.recordId)throw Error('Loaded record context differs from visible controls. Reload this record first.');return this.loaded;}
}
