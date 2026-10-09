# ADR 004: Organization environments and capabilities

**Status:** Accepted

Demo/live behavior is modeled as an organization environment. Capability helpers translate the environment into allowed operations. This avoids scattered `demoMode` conditions and supports pending-review or suspended states later.
