import {expect,it} from 'vitest';
import {parsePublicJSON} from '../src/public-json';
it('rejects duplicate decoded keys even when escaped or nested',()=>{for(const text of ['{"x":1,"x":2}','{"x":1,"\\u0078":2}','{"a":[{"x":true,"x":false}]}'])expect(()=>parsePublicJSON(text)).toThrow('Duplicate');});
it('parses actual JSON syntax and refuses trailing or oversized bytes',()=>{expect(parsePublicJSON('{"s":"a\\\"b","values":[true,false,null,-1,1.5e2]}')).toEqual({s:'a"b',values:[true,false,null,-1,150]});for(const text of ['true false','[1,]','{"x":1,}','00','\ufeff{}','{"x":NaN}','{"x":Infinity}','['+'0,'.repeat(17000)+'0]'])expect(()=>parsePublicJSON(text)).toThrow();});
