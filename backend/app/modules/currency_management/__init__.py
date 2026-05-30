"""Currency Management — global platform settings module.

Centrally configured currencies + locally-stored exchange rates, rate change
history, and sync logs. Invoices/reports/analytics consume the *stored* rates
(never live API calls). Live-sync uses a provider abstraction (see ``providers``)
so future scheduled jobs can plug in without touching callers.
"""
