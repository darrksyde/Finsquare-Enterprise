# ADR 002: Repository-backed API abstraction

**Status:** Accepted

Persisted domains expose repository interfaces with mock and API implementations. Feature services choose an implementation from typed environment configuration. UI components consume domain operations and never raw HTTP.
