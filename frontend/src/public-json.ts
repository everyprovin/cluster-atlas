// Small strict JSON parser for local preview inputs: duplicate keys are rejected.
// Contract source validation is authoritative and independently checks exact bytes.
export function parsePublicJSON(text:string):unknown{
 if(new TextEncoder().encode(text).length>32768)throw Error('Public source exceeds 32768 bytes.');let at=0;
 const space=()=>{while(/[ \t\r\n]/.test(text[at]??'x'))at++;};
 function string():string{const start=at++;while(at<text.length){const c=text[at++];if(c==='\\'){at++;continue;}if(c==='"')return JSON.parse(text.slice(start,at));}throw Error('Unterminated JSON string.');}
 function value():unknown{space();const c=text[at];if(c==='"')return string();if(c==='{'){at++;space();const out=Object.create(null) as Record<string,unknown>;if(text[at]==='}'){at++;return out;}while(true){space();if(text[at]!=='"')throw Error('JSON object key expected.');const key=string();if(Object.hasOwn(out,key))throw Error('Duplicate JSON key: '+key);space();if(text[at++]!==':')throw Error('JSON colon expected.');out[key]=value();space();const next=text[at++];if(next==='}')return out;if(next!==',')throw Error('JSON object separator expected.');}}
  if(c==='['){at++;space();const out:unknown[]=[];if(text[at]===']'){at++;return out;}while(true){out.push(value());space();const next=text[at++];if(next===']')return out;if(next!==',')throw Error('JSON array separator expected.');}}
  const match=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));if(!match)throw Error('Invalid JSON token.');at+=match[0].length;return JSON.parse(match[0]);
 }
 const result=value();space();if(at!==text.length)throw Error('Trailing JSON bytes.');return result;
}
