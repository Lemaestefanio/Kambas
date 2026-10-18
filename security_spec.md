# Security Specification: Agency Models & Profiles

## 1. Data Invariants
1. A creator document must have a valid ID string (max 128 chars, alphanumeric + hyphens/underscores).
2. The creator avatar must be a string containing a valid image path, URL, or data URI.
3. Photo uploads must be linked to a valid creatorId.
4. Default-deny rule protects all unspecified paths.

## 2. Tested Payloads & Scenarios
- Valid creator profile read (allowed for public preview/browsing).
- Creator profile update with valid fields (allowed).
- Injection attacks with corrupted IDs > 128 chars (blocked by isValidId).
- Writes without mandatory fields (blocked by schema check).
