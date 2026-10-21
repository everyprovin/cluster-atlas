export type ChainRecord={record_id:string;owner:string;status:string;revision:number;source:unknown;result:any;certificate_id:string;source_url:string;source_sha256:string};
export const ascii=(a:string,b:string)=>a<b?-1:a>b?1:0;
function fields(value:any,keys:string[]):void{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort(ascii).join('|')!==[...keys].sort(ascii).join('|'))throw Error('Unexpected schema fields.');}
const id=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(s);
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const canonical=(value:any):string=>value&&typeof value==='object'?(Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort(ascii).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'):JSON.stringify(value);

export type Metric={schema:string;points:string[];distances:number[][]};
export type MST={points:string[];edges:{left:string;right:string;distance:number}[];total_weight:number};
export function validateMetric(value:unknown):Metric{
 const m=value as Metric;fields(m,['schema','points','distances']);
 if(m.schema!=='ClusterAtlas-metric-v1'||!Array.isArray(m.points)||m.points.length<2||m.points.length>10||m.points.some(x=>!id(x))||new Set(m.points).size!==m.points.length)throw Error('Metric point/schema bounds.');
 const n=m.points.length;if(!Array.isArray(m.distances)||m.distances.length!==n||m.distances.some(row=>!Array.isArray(row)||row.length!==n))throw Error('Complete square matrix required.');
 for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(!integer(m.distances[i][j],i===j?0:1,i===j?0:1000000)||m.distances[i][j]!==m.distances[j][i])throw Error('Integer symmetric metric distance invalid.');
 for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(let k=0;k<n;k++)if(m.distances[i][j]>m.distances[i][k]+m.distances[k][j])throw Error('Triangle inequality violated.');
 const points=[...m.points].sort(ascii),indices=points.map(p=>m.points.indexOf(p));return {schema:m.schema,points,distances:indices.map(i=>indices.map(j=>m.distances[i][j]))};
}
export function mst(m:Metric):MST{
 const candidates:MST['edges']=[];for(let i=0;i<m.points.length;i++)for(let j=i+1;j<m.points.length;j++)candidates.push({left:m.points[i],right:m.points[j],distance:m.distances[i][j]});
 candidates.sort((a,b)=>a.distance-b.distance||ascii(a.left,b.left)||ascii(a.right,b.right));
 const parent=new Map(m.points.map(p=>[p,p])),find=(p:string):string=>{while(parent.get(p)!==p)p=parent.get(p)!;return p;};const edges:MST['edges']=[];
 for(const edge of candidates){const l=find(edge.left),r=find(edge.right);if(l===r)continue;parent.set(r,l);edges.push(edge);if(edges.length===m.points.length-1)break;}
 return {points:[...m.points],edges,total_weight:edges.reduce((a,e)=>a+e.distance,0)};
}
export function components(result:MST,threshold:number):string[][]{
 if(!integer(threshold,0,1000000))throw Error('Invalid threshold.');let groups=result.points.map(p=>[p]);
 for(const edge of result.edges){if(edge.distance>threshold)continue;const left=groups.find(g=>g.includes(edge.left))!,right=groups.find(g=>g.includes(edge.right))!;if(left!==right)groups=groups.filter(g=>g!==left&&g!==right).concat([[...left,...right].sort(ascii)]);}
 return groups.sort((a,b)=>ascii(a[0],b[0]));
}
export function assertChainResult(m:Metric,result:unknown):void{if(canonical(mst(m))!==canonical(result))throw Error('Chain MST inconsistent with its metric source.');}
export function canConfirm(r:any,account:string):boolean{return !!account&&r?.owner?.toLowerCase()===account.toLowerCase()&&r?.status==='DERIVED'&&!!r?.result;}
