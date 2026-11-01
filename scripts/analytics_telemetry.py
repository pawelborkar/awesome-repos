"""Optional metadata-only telemetry configured with a project token and host."""
import atexit
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def analytics_configuration(environ=None, manifest=None):
    env = os.environ if environ is None else environ
    if env.get('ANALYTICS_ENABLED') == 'false' or env.get('PRODUCTION') != 'true': return None
    if env.get('GITHUB_REPOSITORY', 'pawelborkar/awesome-repos') != 'pawelborkar/awesome-repos': return None
    token = env.get('PUBLIC_POSTHOG_PROJECT_TOKEN', '').strip()
    host = env.get('PUBLIC_POSTHOG_HOST', '').strip().rstrip('/')
    if not token or not host: return None
    controls = {'products': {'logs': False}}
    try:
        if manifest is None: manifest = json.loads((ROOT / 'config/analytics-manifest.json').read_text())
        target, configured = manifest['target'], manifest['controls']
        if target and configured.get('verified') and target['token_sha256'] == hashlib.sha256(token.encode()).hexdigest():
            controls = configured
    except (OSError, ValueError, KeyError, TypeError): pass
    return token, host, controls


def failure_code(error):
    status = getattr(error, 'code', None)
    if status in (401, 403): return 'authentication_failed'
    if status == 429: return 'quota_exhausted'
    if isinstance(status, int) and status >= 400: return 'provider_error'
    if isinstance(error, json.JSONDecodeError): return 'invalid_json'
    if isinstance(error, (ValueError, KeyError, TypeError, IndexError)): return 'validation_failed'
    if type(error).__name__ == 'QuotaError': return 'quota_exhausted'
    if isinstance(error, (TimeoutError, OSError)): return 'connection_failed'
    return 'workflow_failed'


class Telemetry:
    def __init__(self, workflow, mode='report', *, client_factory=None, configuration=None):
        self.workflow, self.mode = workflow, mode
        self.run_id = ':'.join(filter(None, [os.getenv('GITHUB_RUN_ID'), os.getenv('GITHUB_RUN_ATTEMPT')])) or str(uuid.uuid4())
        self.scheduled = os.getenv('GITHUB_EVENT_NAME') == 'schedule'
        self.started = time.monotonic()
        self.terminal = self.closed = False
        self.client = self.logger = self.log_provider = None
        self.counts = dict(candidate_count=0, screened_count=0, qualified_count=0, proposal_count=0, warning_count=0)
        configuration = analytics_configuration() if configuration is None else configuration
        if configuration:
            try:
                token, host, controls = configuration
                if client_factory is None:
                    from posthog import Posthog
                    client_factory = Posthog
                self.client = client_factory(token, host=host, enable_exception_autocapture=False, privacy_mode=True)
                if controls['products'].get('logs'):
                    from posthog_logs import create_posthog_logger
                    self.logger, self.log_provider = create_posthog_logger(token, host, self.workflow, self.run_id)
            except Exception: print('Optional Awesome Repos telemetry unavailable', file=sys.stderr)
        if self.client or self.log_provider: atexit.register(self.close)

    def common(self):
        return dict(schema_version=2, site='awesome-repos', environment='production', actor_type='automation',
                    release=os.getenv('GITHUB_SHA') or os.getenv('RELEASE_SHA') or 'local', page_type='automation',
                    page_path='', workflow=self.workflow, run_id=self.run_id, mode=self.mode, scheduled=self.scheduled,
                    **{'$process_person_profile': False, '$geoip_disable': True})

    def emit(self, event, properties=None):
        if not self.client: return
        try:
            data = {**self.common(), **(properties or {})}
            self.client.capture(event=event, distinct_id='awesome-repos-automation', properties=data)
            if self.logger:
                metadata = {k: v for k, v in data.items() if not k.startswith('$')}
                metadata.update({key: data[source] for key, source in [('trace_id', '$ai_trace_id'), ('span_id', '$ai_span_id')] if source in data})
                self.logger.info(event, extra=metadata)
        except Exception: print('Optional Awesome Repos telemetry capture failed', file=sys.stderr)

    def __enter__(self):
        self.emit('automation_run_started')
        return self

    def __exit__(self, kind, error, traceback):
        self.finish(error); self.close()
        return False

    def finish(self, error=None):
        if self.terminal: return
        self.terminal = True
        duration = {'duration_ms': round((time.monotonic() - self.started) * 1000)}
        if error: self.emit('automation_run_failed', {**duration, 'failure_code': failure_code(error)})
        else: self.emit('automation_run_completed', {**duration, **self.counts})

    def generation(self, request_data, response_data, trace_id, attempt, started, status=None, error=None, finished=None, request_elapsed_ms=None, backoff_ms=0):
        usage = response_data.get('usage') if isinstance(response_data, dict) else {}
        if not isinstance(usage,dict): usage={}
        properties = {
            '$ai_trace_id': trace_id, '$ai_span_id': str(uuid.uuid4()), '$ai_session_id': None,
            '$ai_provider': 'groq', '$ai_model': request_data.get('model', 'unknown'),
            '$ai_latency': (finished if finished is not None else time.monotonic()) - started, '$ai_http_status': status,
            '$ai_is_error': error is not None, '$ai_stream': False, 'attempt': attempt, 'cost_status': 'unknown',
            'request_elapsed_ms': request_elapsed_ms, 'backoff_ms': backoff_ms,
        }
        for source, destination in [('prompt_tokens', '$ai_input_tokens'), ('completion_tokens', '$ai_output_tokens')]:
            value = usage.get(source)
            if isinstance(value, int) and not isinstance(value, bool) and value >= 0: properties[destination] = value
        if error: properties.update({'$ai_error': failure_code(error), 'failure_code': failure_code(error)})
        self.emit('$ai_generation', properties)

    def close(self):
        if self.closed: return
        self.closed = True
        for object in [self.client, self.log_provider]:
            if object:
                try: object.shutdown()
                except Exception: print('Optional Awesome Repos telemetry flush failed', file=sys.stderr)
