"""Process-local OTLP logger; imported only after verifying the target and log limits."""
import logging


def create_posthog_logger(token, host, workflow, run_id):
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.resources import Resource

    logger = logging.getLogger('awesome_repositories.' + run_id)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    provider = LoggerProvider(resource=Resource.create({'service.name': 'awesome-repositories-' + workflow}))
    exporter = OTLPLogExporter(endpoint=host.rstrip('/') + '/i/v1/logs', headers={'Authorization': 'Bearer ' + token})
    provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
    logger.addHandler(LoggingHandler(logger_provider=provider))
    return logger, provider
