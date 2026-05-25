# Subscription Provider Adapter

RDR-019 intentionally stores newsletter intent in D1 first. The MVP does not call an email provider directly from the public request path.

Future integration point:

- Read active rows from `subscribers`.
- Sync `email`, `locale`, and `status` to the selected provider.
- Store provider IDs, list IDs, sync timestamps, and last error in `subscribers.provider_json`.
- Keep duplicate handling in D1 via `UNIQUE(email, locale)` before provider sync.
- Do not block the public subscribe response on provider availability.
