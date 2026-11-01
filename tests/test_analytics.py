import io
import json
import os
import pathlib
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from analytics_telemetry import Telemetry, analytics_configuration
import curate


class Sink:
    def __init__(self, *args, **kwargs): self.events = []; self.closed = 0
    def capture(self, **event): self.events.append(event)
    def shutdown(self): self.closed += 1


class Response(io.BytesIO):
    status = 200


class AnalyticsTests(unittest.TestCase):
    def telemetry(self): return Telemetry('curation', client_factory=Sink, configuration=('test', 'https://a.awesome.pawel.in', {'products': {'logs': False}}))

    def test_disabled_telemetry_does_not_import_sdk(self):
        with patch.dict(os.environ, {}, clear=True), patch.dict(sys.modules, {'posthog': None, 'opentelemetry': None}):
            with Telemetry('editorial') as telemetry: telemetry.emit('automation_run_started')
            self.assertIsNone(telemetry.client)

    def test_configuration_needs_only_token_host_and_production(self):
        env = dict(PRODUCTION='true', PUBLIC_POSTHOG_PROJECT_TOKEN='test', PUBLIC_POSTHOG_HOST='https://a.awesome.pawel.in')
        manifest = {'target': None, 'controls': {'verified': False, 'products': {}}}
        token, host, controls = analytics_configuration(env, manifest)
        self.assertEqual((token, host), ('test', env['PUBLIC_POSTHOG_HOST']))
        self.assertFalse(controls['products']['logs'])
        self.assertIsNotNone(analytics_configuration({**env, 'PUBLIC_POSTHOG_HOST': 'https://custom.example.com'}, {}))
        for change in [dict(ANALYTICS_ENABLED='false'), dict(PUBLIC_POSTHOG_PROJECT_TOKEN=''), dict(PUBLIC_POSTHOG_HOST=''), dict(GITHUB_REPOSITORY='someone/else'), dict(PRODUCTION='false')]: self.assertIsNone(analytics_configuration({**env, **change}, manifest))

    def test_lifecycle_has_one_terminal_event_and_flush(self):
        telemetry = self.telemetry()
        with telemetry: telemetry.counts['candidate_count'] = 5
        telemetry.finish(); telemetry.close()
        self.assertEqual([e['event'] for e in telemetry.client.events], ['automation_run_started', 'automation_run_completed'])
        self.assertEqual(telemetry.client.closed, 1)
        self.assertEqual(telemetry.client.events[-1]['properties']['actor_type'], 'automation')

    def test_failure_is_sanitized_and_preserves_exception(self):
        telemetry = self.telemetry()
        with self.assertRaises(ValueError):
            with telemetry: raise ValueError('PRIVATE_MARKER')
        self.assertEqual(telemetry.client.events[-1]['event'], 'automation_run_failed')
        self.assertNotIn('PRIVATE_MARKER', json.dumps(telemetry.client.events))

    def test_generation_retries_share_trace_with_unique_spans_and_no_backoff_latency(self):
        telemetry = self.telemetry(); clock = [0.0]
        good = {'choices': [{'message': {'content': 'PRIVATE_MARKER'}}], 'usage': {'prompt_tokens': 12, 'completion_tokens': 3}}
        def send(*args, **kwargs):
            clock[0] += .25
            if clock[0] < 1: raise HTTPError('https://api.groq.com', 429, 'quota', {'Retry-After': '10'}, None)
            return Response(json.dumps(good).encode())
        with patch('curate.request.urlopen', side_effect=send), patch('curate.time.monotonic', side_effect=lambda: clock[0]), patch('curate.time.sleep', side_effect=lambda seconds: clock.__setitem__(0, clock[0] + seconds)):
            value = curate.Client(groq_key='test', telemetry=telemetry).call('/chat/completions', 'POST', {'model': 'test-model', 'messages': [{'content': 'PRIVATE_MARKER'}]}, groq=True)
        self.assertEqual(value, good)
        first, second = [e['properties'] for e in telemetry.client.events]
        self.assertEqual(first['$ai_trace_id'], second['$ai_trace_id']); self.assertNotEqual(first['$ai_span_id'], second['$ai_span_id'])
        self.assertTrue(first['$ai_is_error']); self.assertFalse(second['$ai_is_error'])
        self.assertEqual(first['$ai_latency'], .25); self.assertEqual(second['$ai_latency'], .25)
        self.assertEqual(second['request_elapsed_ms'], 10500); self.assertEqual(second['backoff_ms'], 10000)
        self.assertEqual(second['$ai_input_tokens'], 12)
        self.assertNotIn('PRIVATE_MARKER', json.dumps(telemetry.client.events))
        self.assertNotIn('$ai_total_cost_usd', second)

    def test_logs_include_workflow_and_trace_identifiers_without_bodies(self):
        telemetry = self.telemetry()
        from unittest.mock import Mock
        telemetry.logger = Mock()
        telemetry.generation({'model': 'test', 'messages': ['PRIVATE_MARKER']}, {}, 'trace', 1, 0, finished=.5)
        metadata = telemetry.logger.info.call_args.kwargs['extra']
        self.assertEqual(metadata['workflow'], 'curation')
        self.assertEqual(metadata['trace_id'], 'trace')
        self.assertIn('span_id', metadata)
        self.assertNotIn('PRIVATE_MARKER', json.dumps(metadata))

    def test_malformed_responses_timeouts_and_provider_failures_are_recorded(self):
        for failure in [lambda: Response(b'{'), lambda: Response(b'{"choices":[]}'), lambda: (_ for _ in ()).throw(TimeoutError()), lambda: (_ for _ in ()).throw(HTTPError('https://api.groq.com', 503, 'provider', {}, None))]:
            telemetry = self.telemetry()
            with patch('curate.request.urlopen', side_effect=lambda *a, **k: failure()), patch('curate.time.sleep'):
                with self.assertRaises(curate.ApiError): curate.Client(groq_key='test', telemetry=telemetry).call('/chat/completions', 'POST', {'model': 'test'}, groq=True)
            self.assertTrue(all(e['properties']['$ai_is_error'] for e in telemetry.client.events))
            self.assertGreater(len(telemetry.client.events), 0)

    def test_optional_capture_failure_never_changes_generation_result(self):
        telemetry = self.telemetry(); telemetry.generation = lambda *a, **k: (_ for _ in ()).throw(RuntimeError('SDK'))
        with patch('curate.request.urlopen', return_value=Response(b'{"choices":[{"message":{"content":"ok"}}]}')):
            value = curate.Client(telemetry=telemetry).call('/chat/completions', 'POST', {'model': 'test'}, groq=True)
        self.assertEqual(value['choices'][0]['message']['content'], 'ok')


if __name__ == '__main__': unittest.main()
