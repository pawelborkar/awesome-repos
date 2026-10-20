import copy,datetime as dt,importlib.util,json,pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import curate
from editorial import valid_draft
NOW=dt.datetime(2026,10,20,tzinfo=dt.timezone.utc)
def repo(**overrides):
 r={'id':12,'full_name':'owner/repo','name':'awesome-repo','html_url':'https://github.com/owner/repo','description':'Original | description\nwith a second line','stargazers_count':1000,'forks_count':30,'created_at':'2025-10-20T00:00:00Z','archived':False,'disabled':False,'fork':False,'license':None};r.update(overrides);return r
README='### Books\n\n| Repository | Description | License |\n| --- | --- | --- |\n| [Apple](https://github.com/o/apple) | Apple book | No License |\n| [Zebra](https://github.com/o/zebra) | Zebra book | No License |\n\n### Tools\n\n| Repository | Description | License |\n| --- | --- | --- |\n| [Tool](https://github.com/o/tool) | A tool | No License |\n'
SOURCE='A structured course with practical lessons for learning Python programming.'
def assessment(**overrides):
 a={'educational':True,'free_access':True,'category':'Books','quality':8,'resource_type':'course','technologies':['Python'],'level':'unclassified','audience':'Learners who want to practise Python with structured examples.','value':'Work through practical lessons and test the examples yourself.','limitations':'Read the setup instructions before choosing a working environment.','evidence':[SOURCE]};a.update(overrides);return a
class CurationTests(unittest.TestCase):
 def test_thresholds_and_age(self):
  self.assertEqual(curate.lane(repo(),NOW),'established')
  self.assertEqual(curate.lane(repo(stargazers_count=200),NOW),'emerging')
  self.assertIsNone(curate.lane(repo(stargazers_count=199),NOW))
  self.assertIsNone(curate.lane(repo(stargazers_count=200,created_at='2020-01-01T00:00:00Z'),NOW))
 def test_old_finished_material_is_eligible(self):self.assertEqual(curate.lane(repo(created_at='2010-01-01T00:00:00Z'),NOW),'established')
 def test_exclusion_flags(self):
  for flag in ['archived','disabled','fork']:
   self.assertIsNone(curate.lane(repo(**{flag:True}),NOW))
 def test_calendar_month_cutoff(self):
  self.assertEqual(curate.cutoff(dt.datetime(2024,8,31),6),dt.datetime(2024,2,29))
 def test_ranking(self):self.assertGreater(curate.rank(repo()),curate.rank(repo(stargazers_count=200,forks_count=0)))
 def test_assessment_requires_exact_evidence(self):
  self.assertTrue(curate.assessments_valid(assessment(),['Books'],SOURCE))
  self.assertFalse(curate.assessments_valid(assessment(evidence=['Invented passage that does not exist']),['Books'],SOURCE))
 def test_assessment_invalid_types_scores_and_categories(self):
  for patch in [{'quality':float('nan')},{'quality':True},{'quality':11},{'educational':'yes'},{'category':'Invented'},{'level':'expert'},{'resource_type':'framework'},{'technologies':['x'*51]}]:
   self.assertFalse(curate.assessments_valid(assessment(**patch),['Books'],SOURCE),patch)
 def test_inserts_one_escaped_row_without_reformat(self):
  result=curate.insert_row(README,repo(),assessment(),'No License')
  self.assertIn('Original \\| description with a second line',result)
  self.assertLess(result.index('[repo]'),result.index('[Zebra]'))
  self.assertEqual(len(result.splitlines()),len(README.splitlines())+1)
  self.assertEqual(result.replace(next(l+'\n' for l in result.splitlines() if '[repo]' in l),''),README)
 def test_duplicate_and_unknown_category_rejected(self):
  self.assertRaises(ValueError,curate.insert_row,README,repo(full_name='O/Apple'),assessment(),'No License')
  self.assertRaises(ValueError,curate.insert_row,README,repo(),assessment(category='Unknown'),'No License')
 def test_weekly_and_pending_caps(self):
  prs=[{'state':'open','body':'<!-- awesome-repos-bot resource:2 -->','created_at':NOW.isoformat()}]
  self.assertEqual(curate.proposal_limits(prs,NOW),2)
  self.assertEqual(curate.proposal_limits(prs*3,NOW),0)
  closed={**prs[0],'state':'closed'};self.assertEqual(curate.proposal_limits([closed]*3,NOW),0)
  editorial={'state':'open','body':'<!-- awesome-repos-bot editorial:test -->','created_at':NOW.isoformat()}
  self.assertEqual(curate.proposal_limits([editorial]*3,NOW),0)
 def test_resource_identity_marker_survives_rename(self):self.assertEqual(curate.identity_from_pr({'body':'<!-- awesome-repos-bot resource:12 -->'}),['12'])
 def test_emerging_slot_and_zero_slots(self):
  def candidate(group,score):return {'qualified':True,'license':'No License','lane':group,'assessment':{'quality':score},'popularity':score,'repository':repo()}
  candidates=[candidate('established',10),candidate('established',9),candidate('emerging',8)]
  self.assertEqual(curate.choose_proposals(candidates,1)[0]['lane'],'emerging')
  self.assertEqual(curate.choose_proposals(candidates,0),[])
 def test_screening_preserves_emerging_candidates(self):
  repos=[repo(id=i,stargazers_count=1000+i) for i in range(30)]+[repo(id=90,stargazers_count=200)]
  chosen=curate.choose_screening(repos,NOW);self.assertEqual(len(chosen),20);self.assertTrue(any(r['id']==90 for r in chosen))
 def test_ambiguous_license_is_report_only(self):
  class Mock:
   def call(self,*args):return {'license':{'spdx_id':'NOASSERTION'},'html_url':'https://github.com/o/r/LICENSE'}
  self.assertIsNone(curate.license_cell(Mock(),repo()))
 def test_confirmed_missing_license(self):
  class Mock:
   def call(self,*args):return None
  self.assertEqual(curate.license_cell(Mock(),repo()),'No License')
  self.assertIsNone(curate.license_cell(Mock(),repo(license={'spdx_id':'MIT'})))
 def test_cc_license_link(self):
  class Mock:
   def call(self,*args):return {'license':{'spdx_id':'CC0-1.0'},'html_url':'https://github.com/o/r/LICENSE'}
  self.assertIn('creativecommons.org/publicdomain/zero/1.0/legalcode',curate.license_cell(Mock(),repo()))
 def test_no_api_key_never_calls_ai(self):
  class Mock:groq_key=None
  self.assertIsNone(curate.screen(Mock(),repo(),['Books'],SOURCE))
 def test_history_refuses_incomplete_pagination(self):
  client=curate.Client();client.call=lambda *args:[{}]*100
  self.assertRaises(curate.ApiError,client.pages,'/pulls')
 def test_editorial_evidence_must_cover_every_selection(self):
  keys=[f'o/r{i}' for i in range(5)];excerpts={k:SOURCE for k in keys}
  draft={'title':'A useful collection','description':'A useful description for this collection.','body':'Educational selection guidance. '*20,'selection':'Select resources based on educational scope and intended audience.','journey':'learn','resources':keys,'evidence':[{'key':k,'quote':SOURCE} for k in keys]}
  self.assertTrue(valid_draft(draft,keys,excerpts));draft['evidence'].pop();self.assertFalse(valid_draft(draft,keys,excerpts))
if __name__=='__main__':unittest.main()
