"""Actual pinned SDK integration; only external HTTP is fixture-controlled."""
import copy, hashlib, json, re
from pathlib import Path
import pytest
from gltest.direct import create_address

ROOT=Path(__file__).parents[1]
SOURCE=json.loads((ROOT/'fixtures/source.json').read_text())
BODY=(ROOT/'fixtures/metric.json').read_bytes().decode('utf-8')

def deploy(vm,build):
    vm.warp('2026-10-21T00:00:00Z')
    c=build(str(ROOT/'contract.py'),sdk_version='v0.2.12')
    assert hasattr(c,'lock_source'),'lock_source API not implemented'
    return c

def serve(vm,body=BODY,status=200):
    vm.mock_web(re.escape(SOURCE['test_url']),{'status':status,'body':body})

def lock(vm,c,body=BODY):
    serve(vm,body)
    c.lock_source('demo',SOURCE['test_url'],hashlib.sha256(body.encode()).hexdigest())

def test_owner_revision_revoke_and_permanent_ids(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy);lock(direct_vm,c)
    outsider=create_address('outsider')
    with direct_vm.prank(outsider):
        with direct_vm.expect_revert('owner only'):c.derive('demo',0)
        with direct_vm.expect_revert('owner only'):c.revoke('demo',0,'withdraw')
    with direct_vm.expect_revert('stale revision'):c.derive('demo',1)
    c.derive('demo',0)
    with direct_vm.prank(outsider):
        with direct_vm.expect_revert('owner only'):c.confirm('demo',1)
    with direct_vm.expect_revert('stale revision'):c.confirm('demo',0)
    c.confirm('demo',1)
    d=c.get_record('demo')
    assert d['status']=='CONFIRMED' and d['revision']==2 and len(d['certificate_id'])==64
    direct_vm.clear_mocks();c.revoke('demo',2,'Synthetic certificate withdrawn')
    d=c.get_record('demo');assert d['status']=='REVOKED' and d['revision']==3
    with direct_vm.expect_revert():c.confirm('demo',3)
    with direct_vm.expect_revert():c.revoke('demo',3,'again')
    with direct_vm.expect_revert('already used'):lock(direct_vm,c)

def test_fresh_independent_validator_rejects_changed_bytes_and_forged_binding(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy);lock(direct_vm,c);c.derive('demo',0)
    assert direct_vm.run_validator() is True
    packet=copy.deepcopy(c.get_record('demo')['last_capture'])
    packet['binding']['record_id']='another'
    assert direct_vm.run_validator(leader_result=packet) is False
    packet=copy.deepcopy(c.get_record('demo')['last_capture'])
    packet['result']=None
    assert direct_vm.run_validator(leader_result=packet) is False
    direct_vm.clear_mocks();serve(direct_vm,BODY+' ')
    assert direct_vm.run_validator() is False

def test_confirmation_rechecks_source_and_failed_write_preserves_revision(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy);lock(direct_vm,c);c.derive('demo',0)
    direct_vm.clear_mocks();serve(direct_vm,'gone',404)
    with direct_vm.expect_revert('SOURCE'):c.confirm('demo',1)
    assert c.get_record('demo')['status']=='DERIVED' and c.get_record('demo')['revision']==1

@pytest.mark.parametrize('url',[
 'https://raw.githubusercontent.com/a/b/main/profile05/projects/cluster-atlas/fixtures/metric.json',
 'https://raw.githubusercontent.com/a/b/'+'0'*40+'/profile05/projects/other/fixtures/metric.json',
 'https://raw.githubusercontent.com/a/b/'+'0'*40+'/x/../profile05/projects/cluster-atlas/fixtures/metric.json',
 'https://raw.githubusercontent.com/a/b/'+'0'*40+'/profile05/projects/cluster-atlas/fixtures/metric.json?raw=1',
 'http://raw.githubusercontent.com/a/b/'+'0'*40+'/profile05/projects/cluster-atlas/fixtures/metric.json',
])
def test_rejects_mutable_cross_project_or_noncanonical_source(direct_vm,direct_deploy,url):
    c=deploy(direct_vm,direct_deploy)
    with direct_vm.expect_revert('commit-pinned'):c.lock_source('demo',url,'0'*64)

@pytest.mark.parametrize('body',['x','[]','{}','{'+(' '*32768)+'}', '\ufeff{}'],ids=['invalid','array','empty','oversize','bom'])
def test_rejects_malformed_or_oversized_source(direct_vm,direct_deploy,body):
    c=deploy(direct_vm,direct_deploy)
    with direct_vm.expect_revert():lock(direct_vm,c,body)

def test_digest_and_unknown_record_errors(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy);serve(direct_vm)
    with direct_vm.expect_revert('SOURCE'):c.lock_source('demo',SOURCE['test_url'],'0'*64)
    with direct_vm.expect_revert('unknown record'):c.get_record('missing')
    with direct_vm.expect_revert():c.lock_source('bad id',SOURCE['test_url'],SOURCE['sha256'])

def test_metric_mst_and_threshold_single_linkage_components(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy);lock(direct_vm,c);out=c.derive('demo',0)
    assert out=={'points':['Amber','Birch','Coral','Dune','Elm'],'edges':[{'left':'Dune','right':'Elm','distance':1},{'left':'Amber','right':'Birch','distance':2},{'left':'Birch','right':'Coral','distance':3},{'left':'Coral','right':'Dune','distance':4}],'total_weight':10}
    assert c.components('demo',0)['components']==[['Amber'],['Birch'],['Coral'],['Dune'],['Elm']]
    assert c.components('demo',2)['components']==[['Amber','Birch'],['Coral'],['Dune','Elm']]
    assert c.components('demo',3)['components']==[['Amber','Birch','Coral'],['Dune','Elm']]
    assert c.components('demo',4)['components']==[['Amber','Birch','Coral','Dune','Elm']]
    assert direct_vm.run_validator() is True
    c.confirm('demo',1);assert direct_vm.run_validator() is True

def test_equal_edges_use_ascii_id_tie_order_and_reindex_unsorted_matrix(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy)
    p={'schema':'ClusterAtlas-metric-v1','points':['c','A','b'],'distances':[[0,1,1],[1,0,1],[1,1,0]]}
    lock(direct_vm,c,json.dumps(p));out=c.derive('demo',0)
    assert out=={'points':['A','b','c'],'edges':[{'left':'A','right':'b','distance':1},{'left':'A','right':'c','distance':1}],'total_weight':2}

def test_source_sort_reindexes_nonuniform_distances(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy)
    p={'schema':'ClusterAtlas-metric-v1','points':['c','a','b'],'distances':[[0,5,3],[5,0,2],[3,2,0]]}
    lock(direct_vm,c,json.dumps(p));out=c.derive('demo',0)
    assert out['edges']==[{'left':'a','right':'b','distance':2},{'left':'b','right':'c','distance':3}]

@pytest.mark.parametrize('change',['unknown','nonsquare','asymmetric','diagonal','zero_offdiag','negative','float','bool','too_large','triangle','duplicate_id','one_point','eleven_points','bad_schema'])
def test_strict_complete_metric_boundaries(direct_vm,direct_deploy,change):
    p=json.loads(BODY)
    if change=='unknown':p['extra']=0
    if change=='nonsquare':p['distances'][0].pop()
    if change=='asymmetric':p['distances'][0][1]=3
    if change=='diagonal':p['distances'][0][0]=1
    if change=='zero_offdiag':p['distances'][0][1]=p['distances'][1][0]=0
    if change=='negative':p['distances'][0][1]=p['distances'][1][0]=-1
    if change=='float':p['distances'][0][1]=p['distances'][1][0]=2.0
    if change=='bool':p['distances'][0][1]=p['distances'][1][0]=True
    if change=='too_large':p['distances'][0][1]=p['distances'][1][0]=1000001
    if change=='triangle':p['distances'][0][1]=p['distances'][1][0]=100
    if change=='duplicate_id':p['points'][1]=p['points'][0]
    if change=='one_point':p={'schema':p['schema'],'points':['a'],'distances':[[0]]}
    if change=='eleven_points':p={'schema':p['schema'],'points':['x'+str(i) for i in range(11)],'distances':[[0 if i==j else 1 for j in range(11)] for i in range(11)]}
    if change=='bad_schema':p['schema']='other'
    c=deploy(direct_vm,direct_deploy)
    with direct_vm.expect_revert():lock(direct_vm,c,json.dumps(p))

def test_duplicate_json_and_threshold_state_boundaries(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy)
    with direct_vm.expect_revert('duplicate'):lock(direct_vm,c,BODY.replace('"schema":','"schema":"duplicate", "schema":',1))
    direct_vm.clear_mocks();lock(direct_vm,c)
    with direct_vm.expect_revert('derive first'):c.components('demo',1)
    c.derive('demo',0)
    for threshold in [-1,1000001]:
        with direct_vm.expect_revert('threshold'):c.components('demo',threshold)

def test_ten_point_complete_graph_selects_n_minus_one_edges(direct_vm,direct_deploy):
    c=deploy(direct_vm,direct_deploy)
    p={'schema':'ClusterAtlas-metric-v1','points':['v'+str(i) for i in range(10)],'distances':[[abs(i-j) for j in range(10)] for i in range(10)]}
    lock(direct_vm,c,json.dumps(p));out=c.derive('demo',0)
    assert len(out['edges'])==9 and out['total_weight']==9
    assert c.components('demo',1)['components']==[['v'+str(i) for i in range(10)]]


def test_fixture_metadata_locks_exact_bytes_without_newline_normalization(direct_vm,direct_deploy):
    raw=(ROOT/'fixtures/metric.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()==SOURCE['sha256']
    c=deploy(direct_vm,direct_deploy);serve(direct_vm,raw.decode('utf-8'))
    c.lock_source('exactbytes',SOURCE['test_url'],SOURCE['sha256'])
    assert c.get_record('exactbytes')['source_sha256']==SOURCE['sha256']
