# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json
import re
from datetime import datetime, timezone


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise gl.vm.UserError('[EXPECTED] '+message)


def _canonical(value) -> str:
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)


def _now() -> int:
    value=datetime.fromisoformat(gl.message_raw['datetime'].replace('Z','+00:00'))
    if value.tzinfo is None:
        value=value.replace(tzinfo=timezone.utc)
    delta=value.astimezone(timezone.utc)-datetime(1970,1,1,tzinfo=timezone.utc)
    return delta.days*86400+delta.seconds


def _identifier(value) -> None:
    _require(isinstance(value,str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,23}',value) is not None,'invalid ASCII identifier')


def _source_locator(url: str,digest: str) -> None:
    pattern=r'https://raw\.githubusercontent\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9_.-]{1,100}/[0-9a-f]{40}/([A-Za-z0-9_.~/-]+)'
    match=re.fullmatch(pattern,url) if isinstance(url,str) and len(url)<=512 else None
    _require(match is not None and all(part not in ('','.','..') for part in url.split('/')[3:]) and url.endswith('/profile05/projects/cluster-atlas/fixtures/metric.json'),'commit-pinned project source required')
    _require(isinstance(digest,str) and re.fullmatch(r'[0-9a-f]{64}',digest) is not None,'invalid SHA256')


def _unique_pairs(pairs: list) -> dict:
    result={}
    for key,value in pairs:
        _require(key not in result,'duplicate JSON key')
        result[key]=value
    return result


def _parse_json(body: bytes):
    _require(1<=len(body)<=32768,'source byte bound')
    try:
        return json.loads(body.decode('utf-8'),object_pairs_hook=_unique_pairs)
    except (ValueError,UnicodeError,RecursionError):
        raise gl.vm.UserError('[SOURCE] invalid UTF-8 JSON')


def _fetch(url: str,digest: str) -> dict:
    response=gl.nondet.web.get(url,headers={'Accept':'application/json'})
    if response.status!=200 or response.body is None or not 1<=len(response.body)<=32768:
        raise gl.vm.UserError('[SOURCE] source unavailable or oversized')
    if hashlib.sha256(response.body).hexdigest()!=digest:
        raise gl.vm.UserError('[SOURCE] source byte SHA256 mismatch')
    return _validate(_parse_json(response.body))


def _validate(value) -> dict:
    _require(isinstance(value,dict) and set(value)=={'schema','points','distances'} and value['schema']=='ClusterAtlas-metric-v1','metric schema fields')
    points=value['points'];matrix=value['distances']
    _require(isinstance(points,list) and 2<=len(points)<=10,'point count 2..10')
    for point in points:
        _identifier(point)
    _require(len(set(points))==len(points),'duplicate point ID')
    n=len(points)
    _require(isinstance(matrix,list) and len(matrix)==n and all(isinstance(row,list) and len(row)==n for row in matrix),'complete square distance matrix required')
    for i in range(n):
        for j in range(n):
            distance=matrix[i][j]
            _require(type(distance) is int and (distance==0 if i==j else 1<=distance<=1000000),'integer metric distance bounds')
            _require(distance==matrix[j][i],'symmetric distances required')
    for i in range(n):
        for j in range(n):
            for k in range(n):
                _require(matrix[i][j]<=matrix[i][k]+matrix[k][j],'triangle inequality violated')
    ordered=sorted(points);indices=[points.index(point) for point in ordered]
    return {'schema':value['schema'],'points':ordered,'distances':[[matrix[i][j] for j in indices] for i in indices]}


def _derive(metric: dict) -> dict:
    points=metric['points'];n=len(points);parents=list(range(n))
    candidates=sorted((metric['distances'][i][j],points[i],points[j],i,j) for i in range(n) for j in range(i+1,n))
    edges=[];total=0
    for distance,left,right,i,j in candidates:
        a=i;b=j
        while parents[a]!=a:
            a=parents[a]
        while parents[b]!=b:
            b=parents[b]
        if a==b:
            continue
        parents[b]=a;edges.append({'left':left,'right':right,'distance':distance});total+=distance
        if len(edges)==n-1:
            break
    _require(len(edges)==n-1,'MST spanning invariant')
    return {'points':points,'edges':edges,'total_weight':total}


def _components(result: dict,threshold: int) -> dict:
    _require(type(threshold) is int and 0<=threshold<=1000000,'threshold integer 0..1000000')
    groups=[[point] for point in result['points']]
    for edge in result['edges']:
        if edge['distance']>threshold:
            continue
        left=next(group for group in groups if edge['left'] in group)
        right=next(group for group in groups if edge['right'] in group)
        if left is not right:
            groups.remove(left);groups.remove(right);groups.append(sorted(left+right))
    return {'threshold':threshold,'components':sorted(groups,key=lambda group:group[0]),'component_count':len(groups)}

def _capture(url: str,digest: str,binding: dict) -> dict:
    def leader() -> dict:
        source=_fetch(url,digest)
        return {'binding':binding,'source_sha256':digest,'source':source,'result':None if binding['operation']=='lock' else _derive(source)}
    def validator(proposed: gl.vm.Result) -> bool:
        if not isinstance(proposed,gl.vm.Return):
            return False
        try:
            return _canonical(leader())==_canonical(proposed.calldata)
        except Exception:
            return False
    return gl.vm.run_nondet_unsafe(leader,validator)


class ClusterAtlas(gl.Contract):
    records: TreeMap[str,str]

    def __init__(self):
        pass

    def _record(self,record_id: str) -> dict:
        _require(record_id in self.records,'unknown record')
        return json.loads(self.records[record_id])

    def _owner_revision(self,record: dict,expected_revision: int) -> None:
        _require(gl.message.sender_address.as_hex.lower()==record['owner'],'owner only')
        _require(type(expected_revision) is int and expected_revision==record['revision'],'stale revision')

    def _binding(self,record: dict,operation: str) -> dict:
        return {'protocol':'ClusterAtlas-v1','chain_id':int(gl.message.chain_id),'contract':gl.message.contract_address.as_hex.lower(),'owner':record['owner'],'record_id':record['record_id'],'source_url':record['source_url'],'source_sha256':record['source_sha256'],'revision':record['revision'],'operation':operation,'observed_at':_now()}

    @gl.public.write
    def lock_source(self,record_id: str,source_url: str,source_sha256: str) -> None:
        _identifier(record_id);_source_locator(source_url,source_sha256)
        _require(record_id not in self.records,'record ID already used')
        record={'record_id':record_id,'owner':gl.message.sender_address.as_hex.lower(),'source_url':source_url,'source_sha256':source_sha256,'status':'LOCKED','revision':0,'locked_at':_now(),'derived_at':0,'confirmed_at':0,'revoked_at':0,'reason':'','result':None,'certificate_id':''}
        packet=_capture(source_url,source_sha256,self._binding(record,'lock'))
        record['source']=packet['source'];record['last_capture']=packet
        self.records[record_id]=_canonical(record)

    @gl.public.write
    def derive(self,record_id: str,expected_revision: int) -> dict:
        record=self._record(record_id);self._owner_revision(record,expected_revision)
        _require(record['status']=='LOCKED','record not locked')
        packet=_capture(record['source_url'],record['source_sha256'],self._binding(record,'derive'))
        _require(_canonical(packet['source'])==_canonical(record['source']),'source snapshot mismatch')
        record['result']=packet['result'];record['last_capture']=packet;record['status']='DERIVED';record['revision']=1;record['derived_at']=_now()
        self.records[record_id]=_canonical(record)
        return record['result']

    @gl.public.write
    def confirm(self,record_id: str,expected_revision: int) -> None:
        record=self._record(record_id);self._owner_revision(record,expected_revision)
        _require(record['status']=='DERIVED','record not derived')
        pass
        packet=_capture(record['source_url'],record['source_sha256'],self._binding(record,'confirm'))
        _require(_canonical(packet['source'])==_canonical(record['source']) and _canonical(packet['result'])==_canonical(record['result']),'derived snapshot mismatch')
        record['last_capture']=packet;record['status']='CONFIRMED';record['revision']=2;record['confirmed_at']=_now()
        record['certificate_id']=hashlib.sha256(_canonical(packet).encode('utf-8')).hexdigest()
        self.records[record_id]=_canonical(record)

    @gl.public.write
    def revoke(self,record_id: str,expected_revision: int,reason: str) -> None:
        record=self._record(record_id);self._owner_revision(record,expected_revision)
        _require(record['status']!='REVOKED','record already revoked')
        _require(isinstance(reason,str) and 1<=len(reason)<=200 and reason==reason.strip(),'reason required 1..200 characters')
        record['status']='REVOKED';record['revision']+=1;record['reason']=reason;record['revoked_at']=_now()
        self.records[record_id]=_canonical(record)

    @gl.public.view
    def get_record(self,record_id: str) -> dict:
        return self._record(record_id)

    @gl.public.view
    def get_configuration(self) -> dict:
        return {'protocol':'ClusterAtlas-v1','max_points':10,'max_distance':1000000,'max_source_bytes':32768,'real_similarity_claimed':False}

    @gl.public.view
    def components(self,record_id: str,threshold: int) -> dict:
        record=self._record(record_id)
        _require(record['result'] is not None,'derive first')
        return _components(record['result'],threshold)

