#!/usr/bin/env python3
"""Plan, then explicitly apply verified local MP4 optimization to published media.

Plan (default, remote reads only):
  python3 scripts/optimize-published-media.py --repo .
Apply the exact saved document versions:
  python3 scripts/optimize-published-media.py --repo . --apply /private/plan-directory --owner-uid FIREBASE_UID

Requires gcloud authentication; apply also requires ffmpeg/ffprobe. Never changes
rules, IAM, ACLs, originals, or unrelated document fields. Reports omit URLs and
tokens. Private backups necessarily contain the original document URLs.
"""
from __future__ import annotations

import argparse
import base64
import copy
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from urllib import error, parse, request
import uuid

VERSION = "kambas-mp4-v1"
MAX_BYTES = 100 * 1024 * 1024
TOP_FIELDS = {"banner", "bannerVideo", "previewVideo", "posts", "highlights"}
HOSTS = {"firestore.googleapis.com", "storage.googleapis.com", "firebasestorage.googleapis.com"}


class RemoteError(RuntimeError):
    def __init__(self, code: int, status: str = ""):
        self.code, self.status = code, status
        super().__init__(f"Remote request failed: HTTP {code}, status {status or 'unavailable'}")


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RemoteError(code, "REDIRECT_REJECTED")


class API:
    def __init__(self, project: str):
        self.project = project
        self.token, self.token_at = "", 0.0
        self.opener = request.build_opener(NoRedirect())

    def headers(self) -> dict:
        if not self.token or time.monotonic() - self.token_at > 1800:
            result = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, timeout=30)
            if result.returncode or not result.stdout.strip():
                raise RuntimeError("gcloud authentication failed; no credentials were logged.")
            self.token, self.token_at = result.stdout.strip(), time.monotonic()
        return {"Authorization": f"Bearer {self.token}", "x-goog-user-project": self.project}

    def open(self, url: str, method: str = "GET", data: bytes | None = None, headers: dict | None = None, public: bool = False):
        parsed = parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname not in HOSTS or parsed.port or parsed.username or parsed.password:
            raise ValueError("Network destination is outside the explicit Google API allowlist.")
        merged = {} if public else self.headers()
        merged.update(headers or {})
        try:
            return self.opener.open(request.Request(url, data=data, headers=merged, method=method), timeout=120)
        except error.HTTPError as cause:
            status = ""
            try:
                status = json.loads(cause.read(32768)).get("error", {}).get("status", "")
            except (ValueError, AttributeError):
                pass
            raise RemoteError(cause.code, status if re.fullmatch(r"[A-Z_]{1,80}", status) else "") from None
        except (error.URLError, TimeoutError, OSError):
            raise RemoteError(0, "NETWORK_ERROR") from None

    def json(self, url: str, method: str = "GET", value: dict | None = None) -> dict:
        payload = None if value is None else json.dumps(value).encode()
        with self.open(url, method, payload, {"Content-Type": "application/json"}) as response:
            body = response.read(32 * 1024 * 1024 + 1)
        if len(body) > 32 * 1024 * 1024:
            raise ValueError("API response exceeds the safety limit.")
        return json.loads(body)


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def digest_file(path: Path, algorithm: str = "sha256") -> str:
    digest = hashlib.new(algorithm)
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_private(path: Path, value: dict | list) -> None:
    descriptor, temporary = tempfile.mkstemp(prefix=".write-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w") as output:
            os.fchmod(output.fileno(), 0o600)
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def config(repo: Path) -> dict:
    source = json.loads((repo / "firebase-applet-config.json").read_text())
    selected = {"project": source["projectId"], "database": source["firestoreDatabaseId"], "bucket": source["storageBucket"]}
    if not all(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9.()_-]{1,200}", value) for value in selected.values()):
        raise ValueError("Invalid project, named database, or bucket configuration.")
    return selected


def document_prefix(cfg: dict) -> str:
    return f"projects/{cfg['project']}/databases/{cfg['database']}/documents/creators/"


def document_url(name: str, cfg: dict) -> str:
    if not name.startswith(document_prefix(cfg)) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", name[len(document_prefix(cfg)):]):
        raise ValueError("Document is outside this project's creators collection.")
    return "https://firestore.googleapis.com/v1/" + parse.quote(name, safe="/()")


def object_url(bucket: str, name: str) -> str:
    return f"https://storage.googleapis.com/storage/v1/b/{parse.quote(bucket, safe='')}/o/{parse.quote(name, safe='')}"


def public_url(bucket: str, name: str, token: str) -> str:
    return f"https://firebasestorage.googleapis.com/v0/b/{parse.quote(bucket, safe='')}/o/{parse.quote(name, safe='')}?" + parse.urlencode({"alt": "media", "token": token})


def value_at(document: dict, path: list) -> dict:
    value = {"mapValue": {"fields": document.get("fields", {})}}
    for part in path:
        value = value["arrayValue"]["values"][part] if isinstance(part, int) else value["mapValue"]["fields"][part]
    return value


def video_references(document: dict):
    fields = document.get("fields", {})
    for name in ("banner", "bannerVideo", "previewVideo"):
        value = fields.get(name, {}).get("stringValue")
        if isinstance(value, str) and value:
            yield [name], value
    for collection, primary, video_type in (("posts", "video", "video"), ("highlights", "mediaUrl", "video")):
        for index, item in enumerate(fields.get(collection, {}).get("arrayValue", {}).get("values", [])):
            nested = item.get("mapValue", {}).get("fields", {})
            if nested.get("type", {}).get("stringValue") != video_type:
                continue
            for name in (primary, "previewUrl"):
                value = nested.get(name, {}).get("stringValue")
                if isinstance(value, str) and value:
                    yield [collection, index, name], value


def locator(url: str, cfg: dict, repo: Path) -> dict | None:
    if len(url) > 8192:
        return None
    parsed = parse.urlsplit(url)
    if not parsed.scheme and not parsed.netloc and parsed.path.startswith("/assets/") and not parsed.query and not parsed.fragment:
        path = (repo / "public" / parse.unquote(parsed.path.lstrip("/"))).resolve()
        assets = (repo / "public/assets").resolve()
        if path.suffix.lower() != ".mp4" or assets not in path.parents or not path.is_file():
            return None
        return {"kind": "repo", "relative_path": str(path.relative_to(repo))}
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port or parsed.fragment:
        return None
    name = None
    if parsed.hostname == "firebasestorage.googleapis.com":
        parts = parsed.path.split("/")
        query = parse.parse_qs(parsed.query)
        if len(parts) == 6 and parts[1:3] == ["v0", "b"] and parse.unquote(parts[3]) == cfg["bucket"] and parts[4] == "o" and set(query) <= {"alt", "token"} and query.get("alt") == ["media"]:
            name = parse.unquote(parts[5])
    elif parsed.hostname == "storage.googleapis.com" and not parsed.query:
        prefix = f"/{cfg['bucket']}/"
        if parsed.path.startswith(prefix):
            name = parse.unquote(parsed.path[len(prefix):])
    if not name or not name.startswith("public/") or not name.lower().endswith(".mp4") or any(part in (".", "..", "") for part in name.split("/")):
        return None
    return {"kind": "bucket", "object": name}


def source_key(source: dict) -> str:
    return hashlib.sha256(json.dumps(source, sort_keys=True).encode()).hexdigest()


def public_source_check(api: API, url: str) -> None:
    # The locator is checked before this helper. Do not use OAuth to infer that
    # a visitor can access a source: revoked/private links must remain untouched.
    with api.open(url, headers={"Range": "bytes=0-31"}, public=True) as response:
        if not response.read(32):
            raise ValueError("The original public media URL returned no bytes.")


def fresh_source(api: API, cfg: dict, source: dict, repo: Path) -> None:
    if source["kind"] == "bucket":
        metadata = api.json(object_url(cfg["bucket"], source["object"]))
        if str(metadata["generation"]) != source["generation"] or int(metadata["size"]) != source["bytes"]:
            raise ValueError("Storage source changed after planning.")
    else:
        local = (repo / source["relative_path"]).resolve()
        if (repo / "public/assets").resolve() not in local.parents or local.stat().st_size != source["bytes"] or digest_file(local) != source["sha256"]:
            raise ValueError("Repository source changed after planning.")


def make_plan(repo: Path, root: Path, max_total: int) -> dict:
    if root == repo or repo in root.parents:
        raise ValueError("Private backups must be outside the repository.")
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory = root / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex)
    directory.mkdir(mode=0o700)
    cfg, docs = config(repo), []
    api = API(cfg["project"])
    endpoint = "https://firestore.googleapis.com/v1/" + document_prefix(cfg).rstrip("/")
    page = ""
    while True:
        query = {"pageSize": "100"}
        if page:
            query["pageToken"] = page
        result = api.json(endpoint + "?" + parse.urlencode(query))
        docs.extend(result.get("documents", []))
        if len(docs) > 1000:
            raise ValueError("More than 1000 creators; split the task before applying.")
        page = result.get("nextPageToken", "")
        if not page:
            break
    write_private(directory / "original-documents.json", docs)
    sources, documents, seen, publicly_checked = {}, [], {}, set()
    skipped = {"unsupported_or_non_mp4": 0, "already_optimized": 0, "oversize_or_empty": 0, "not_publicly_accessible": 0}
    for doc in docs:
        document_url(doc["name"], cfg)
        refs = []
        for path, url in video_references(doc):
            source = locator(url, cfg, repo)
            if source is None:
                skipped["unsupported_or_non_mp4"] += 1
                continue
            if source["kind"] == "bucket" and url not in publicly_checked:
                try:
                    public_source_check(api, url)
                except (RemoteError, ValueError):
                    skipped["not_publicly_accessible"] += 1
                    continue
                publicly_checked.add(url)
            identity = source_key(source)
            if identity not in seen:
                record = dict(source)
                if source["kind"] == "repo":
                    local = repo / source["relative_path"]
                    record.update(bytes=local.stat().st_size, sha256=digest_file(local))
                else:
                    metadata = api.json(object_url(cfg["bucket"], source["object"]))
                    if metadata.get("metadata", {}).get("kambasOptimizationVersion") == VERSION:
                        seen[identity] = None
                        skipped["already_optimized"] += 1
                        continue
                    record.update(bytes=int(metadata["size"]), generation=str(metadata["generation"]), md5=metadata.get("md5Hash"))
                if not 0 < record["bytes"] <= MAX_BYTES:
                    seen[identity] = None
                    skipped["oversize_or_empty"] += 1
                    continue
                sources[identity] = record
                seen[identity] = identity
            if seen[identity]:
                refs.append({"path": path, "source": identity})
        if refs:
            documents.append({"name": doc["name"], "updateTime": doc["updateTime"], "references": refs})
    total = sum(source["bytes"] for source in sources.values())
    if total > max_total or len(sources) > 100:
        raise ValueError("Plan exceeds the explicit total-byte or 100-source limit; no remote changes made.")
    plan = {"version": VERSION, "createdAt": utcnow(), "config": cfg, "documents": documents, "sources": sources,
            "backup_sha256": digest_file(directory / "original-documents.json"), "total_source_bytes": total}
    write_private(directory / "manifest.json", plan)
    report = {"mode": "plan", "plan_directory": str(directory), "remote_changes": 0,
              "documents": len(documents), "unique_videos": len(sources), "source_bytes": total, "skipped": skipped}
    write_private(directory / "report.json", report)
    return report


def download_source(api: API, cfg: dict, source: dict, repo: Path, destination: Path) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=".download-", suffix=".mp4", dir=destination.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        _download_source(api, cfg, source, repo, temporary)
        # Only a completely verified download becomes a reusable cache entry.
        # A process interruption can leave a hidden temporary, never a partial
        # original.mp4 that would poison the next attempt.
        os.link(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def _download_source(api: API, cfg: dict, source: dict, repo: Path, destination: Path) -> None:
    if source["kind"] == "repo":
        local = (repo / source["relative_path"]).resolve()
        if (repo / "public/assets").resolve() not in local.parents or local.suffix.lower() != ".mp4" or local.stat().st_size != source["bytes"] or digest_file(local) != source["sha256"]:
            raise ValueError("Repository source changed after the plan.")
        shutil.copyfile(local, destination)
    else:
        metadata = api.json(object_url(cfg["bucket"], source["object"]))
        if str(metadata["generation"]) != source["generation"]:
            raise ValueError("Storage source generation changed after the plan.")
        url = object_url(cfg["bucket"], source["object"]) + "?" + parse.urlencode({"alt": "media", "generation": source["generation"]})
        with api.open(url) as response, destination.open("wb") as output:
            expected = int(response.headers.get("Content-Length", source["bytes"]))
            if expected > MAX_BYTES:
                raise ValueError("Download exceeds 100 MB.")
            total = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_BYTES:
                    raise ValueError("Download exceeded 100 MB; stopped.")
                output.write(chunk)
            output.flush()
            os.fsync(output.fileno())
    os.chmod(destination, 0o600)
    if destination.stat().st_size != source["bytes"]:
        raise ValueError("Downloaded byte count does not match the plan.")
    if source.get("sha256") and digest_file(destination) != source["sha256"]:
        raise ValueError("Copied repository media checksum mismatch.")
    if source.get("md5") and base64.b64encode(bytes.fromhex(digest_file(destination, "md5"))).decode() != source["md5"]:
        raise ValueError("Downloaded media checksum mismatch.")


def encode(repo: Path, original: Path, output: Path, report_path: Path) -> dict:
    process = subprocess.Popen([sys.executable, str(repo / "scripts/optimize-videos.py"), str(original), str(output)],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    try:
        stdout, _stderr = process.communicate(timeout=1800)
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate()
        raise RuntimeError("Encoding stopped or exceeded 30 minutes; no document changed.") from None
    result = json.loads(stdout)
    write_private(report_path, result)
    if process.returncode or result.get("status") not in ("optimized", "not_smaller"):
        raise RuntimeError("Local optimization failed verification; inspect the private encoding report.")
    if result["status"] == "optimized" and (not result.get("verification", {}).get("passed") or not output.is_file()
            or output.stat().st_size != result["bytes_after"] or output.stat().st_size >= original.stat().st_size):
        raise ValueError("Optimizer output did not pass independent size/report checks.")
    return result


def upload(api: API, cfg: dict, path: Path, record: dict, key: str, uid: str) -> dict:
    expected_md5 = base64.b64encode(bytes.fromhex(digest_file(path, "md5"))).decode()
    endpoint = object_url(cfg["bucket"], record["object"])
    try:
        metadata = api.json(endpoint)
    except RemoteError as cause:
        if cause.code != 404:
            raise
        boundary = "kambas-" + uuid.uuid4().hex
        metadata_body = {"name": record["object"], "contentType": "video/mp4", "cacheControl": "public,max-age=31536000,immutable",
                         "metadata": {"uploadedBy": uid, "firebaseStorageDownloadTokens": record["token"],
                                      "kambasOptimizationVersion": VERSION, "kambasOptimizationSource": key}}
        body = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode()
                + json.dumps(metadata_body).encode() + f"\r\n--{boundary}\r\nContent-Type: video/mp4\r\n\r\n".encode()
                + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode())
        target = f"https://storage.googleapis.com/upload/storage/v1/b/{parse.quote(cfg['bucket'], safe='')}/o?uploadType=multipart&ifGenerationMatch=0"
        with api.open(target, "POST", body, {"Content-Type": f"multipart/related; boundary={boundary}"}) as response:
            response.read(1024 * 1024)
        metadata = api.json(endpoint)
    custom = metadata.get("metadata", {})
    if int(metadata["size"]) != path.stat().st_size or metadata.get("md5Hash") != expected_md5 or metadata.get("contentType") != "video/mp4" or custom.get("firebaseStorageDownloadTokens") != record["token"] or custom.get("kambasOptimizationSource") != key:
        raise ValueError("Uploaded object failed size, checksum, or metadata verification.")
    with api.open(public_url(cfg["bucket"], record["object"], record["token"]), headers={"Range": "bytes=0-31"}, public=True) as response:
        first_bytes = response.read(32)
    with path.open("rb") as local:
        if first_bytes != local.read(32):
            raise ValueError("Public playback URL verification failed.")
    return {**record, "status": "uploaded", "bytes": path.stat().st_size, "generation": str(metadata["generation"]), "md5": expected_md5}


def apply_plan(repo: Path, directory: Path, uid: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", uid):
        raise ValueError("A valid --owner-uid is required for apply.")
    plan = json.loads((directory / "manifest.json").read_text())
    cfg = config(repo)
    if plan.get("version") != VERSION or plan["config"] != cfg or digest_file(directory / "original-documents.json") != plan["backup_sha256"]:
        raise ValueError("Plan/config/backup mismatch; generate a new plan.")
    originals = {doc["name"]: doc for doc in json.loads((directory / "original-documents.json").read_text())}
    state_path = directory / "apply-state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {"owner_uid": uid, "sources": {}, "documents": {}}
    if state["owner_uid"] != uid:
        raise ValueError("The saved apply owner differs from --owner-uid.")
    api = API(cfg["project"])
    report = {"mode": "apply", "plan_directory": str(directory), "documents": {}, "sources": {}, "originals_deleted": 0}
    eligible = []
    for planned in plan["documents"]:
        name = planned["name"]
        identity = name.rsplit("/", 1)[1]
        previous = state["documents"].get(name, {})
        if previous.get("status") in ("verified", "superseded"):
            report["documents"][identity] = "already_applied"
            continue
        try:
            current = api.json(document_url(name, cfg))
        except RemoteError as cause:
            if cause.code == 404:
                report["documents"][identity] = "deleted_since_plan"
                continue
            raise
        if previous.get("status") in ("patched", "patch_pending"):
            expected = previous.get("expected_fields", {})
            matches = expected and all(current.get("fields", {}).get(key) == expected[key] for key in previous["fields"])
            if matches:
                previous.update(status="verified", updateTime=current["updateTime"])
                write_private(state_path, state)
                report["documents"][identity] = "verified_on_resume"
                continue
            if current.get("updateTime") != planned["updateTime"]:
                previous["status"] = "superseded"
                write_private(state_path, state)
                report["documents"][identity] = "concurrent_edit_skipped"
                continue
        if current.get("updateTime") != planned["updateTime"]:
            report["documents"][identity] = "conflict_before_processing"
        else:
            try:
                for reference in planned["references"]:
                    if plan["sources"][reference["source"]]["kind"] == "bucket":
                        public_source_check(api, value_at(originals[name], reference["path"])["stringValue"])
            except (RemoteError, ValueError, OSError):
                report["documents"][identity] = "source_changed_or_access_revoked"
                continue
            eligible.append(planned)
    needed = {reference["source"] for doc in eligible for reference in doc["references"]}
    source_public_urls = {key: set() for key in needed}
    for planned in eligible:
        for reference in planned["references"]:
            key = reference["source"]
            if plan["sources"][key]["kind"] == "bucket":
                source_public_urls[key].add(value_at(originals[planned["name"]], reference["path"])["stringValue"])
    work = directory / "media"
    work.mkdir(exist_ok=True, mode=0o700)
    verified_sources = set()
    for key in sorted(needed):
        source = plan["sources"][key]
        saved = state["sources"].get(key, {})
        original, candidate = work / f"{key}-original.mp4", work / f"{key}-optimized.mp4"
        try:
            if saved.get("status") == "not_smaller":
                report["sources"][key[:12]] = {"status": "not_smaller"}
                continue
            fresh_source(api, cfg, source, repo)
            if not original.exists():
                download_source(api, cfg, source, repo, original)
            if original.stat().st_size != source["bytes"]:
                raise ValueError("Saved source byte count mismatch.")
            original_hash = digest_file(original)
            if saved.get("original_sha256") and saved["original_sha256"] != original_hash:
                raise ValueError("Saved source checksum changed.")
            if source.get("sha256") and source["sha256"] != original_hash:
                raise ValueError("Saved repository source checksum mismatch.")
            if source.get("md5") and base64.b64encode(bytes.fromhex(digest_file(original, "md5"))).decode() != source["md5"]:
                raise ValueError("Saved Storage source checksum mismatch.")
            saved["original_sha256"] = original_hash
            state["sources"][key] = saved
            write_private(state_path, state)
            if not saved.get("candidate_sha256"):
                candidate.unlink(missing_ok=True)
                result = encode(repo, original, candidate, work / f"{key}-encoding.json")
                if result["status"] == "not_smaller":
                    state["sources"][key] = {"status": "not_smaller"}
                    write_private(state_path, state)
                    report["sources"][key[:12]] = {"status": "not_smaller"}
                    continue
                saved = {"status": "reserved", "object": f"public/{uid}/{uuid.uuid4()}-optimized-v1.mp4", "token": str(uuid.uuid4()), "candidate_sha256": digest_file(candidate), "original_sha256": original_hash}
                state["sources"][key] = saved
                write_private(state_path, state)
            if not candidate.is_file() or digest_file(candidate) != saved["candidate_sha256"]:
                raise ValueError("Saved optimized file changed or is missing.")
            # Recheck after potentially lengthy encoding and on every resume,
            # before creating a new publicly accessible object.
            fresh_source(api, cfg, source, repo)
            for url in source_public_urls[key]:
                public_source_check(api, url)
            saved = upload(api, cfg, candidate, saved, key, uid)
            state["sources"][key] = saved
            write_private(state_path, state)
            verified_sources.add(key)
            report["sources"][key[:12]] = {"status": "uploaded_or_reused", "bytes_before": source["bytes"], "bytes_after": saved["bytes"]}
        except (ValueError, RuntimeError, OSError, KeyError):
            report["sources"][key[:12]] = {"status": "failed_no_document_change"}
    for planned in eligible:
        name, original = planned["name"], originals[planned["name"]]
        identity = name.rsplit("/", 1)[1]
        revised, changed = copy.deepcopy(original), set()
        for reference in planned["references"]:
            saved = state["sources"].get(reference["source"], {})
            if reference["source"] not in verified_sources or saved.get("status") != "uploaded":
                continue
            path = reference["path"]
            if path[0] not in TOP_FIELDS:
                raise ValueError("Unexpected update-mask field.")
            value_at(revised, path)["stringValue"] = public_url(cfg["bucket"], saved["object"], saved["token"])
            changed.add(path[0])
        if not changed:
            report["documents"][identity] = "no_smaller_verified_media"
            continue
        try:
            checked = set()
            for reference in planned["references"]:
                key = reference["source"]
                if key not in verified_sources:
                    continue
                if key not in checked:
                    fresh_source(api, cfg, plan["sources"][key], repo)
                    checked.add(key)
                if plan["sources"][key]["kind"] == "bucket":
                    public_source_check(api, value_at(original, reference["path"])["stringValue"])
        except (RemoteError, ValueError, OSError):
            report["documents"][identity] = "source_changed_or_access_revoked"
            continue
        fields = {key: revised["fields"][key] for key in changed}
        fields["updatedAt"] = {"timestampValue": utcnow()}
        query = [("updateMask.fieldPaths", key) for key in sorted(changed | {"updatedAt"})]
        query.append(("currentDocument.updateTime", planned["updateTime"]))
        state["documents"][name] = {"status": "patch_pending", "fields": sorted(changed), "expected_fields": fields}
        write_private(state_path, state)
        try:
            patched = api.json(document_url(name, cfg) + "?" + parse.urlencode(query), "PATCH", {"fields": fields})
            state["documents"][name].update(status="patched", updateTime=patched["updateTime"])
            write_private(state_path, state)
        except RemoteError as cause:
            report["documents"][identity] = "concurrent_edit_skipped" if cause.code in (409, 412) or cause.status in ("FAILED_PRECONDITION", "ABORTED") else "patch_failed_or_uncertain"
            continue
        verified = api.json(document_url(name, cfg))
        matches = all(verified.get("fields", {}).get(key) == fields[key] for key in changed)
        status = "verified" if matches else "superseded" if verified.get("updateTime") != patched["updateTime"] else "verification_failed"
        state["documents"][name]["status"] = status
        write_private(state_path, state)
        report["documents"][identity] = status
    write_private(directory / "apply-report.json", report)
    return report


def main() -> int:
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--backup-root", type=Path, default=Path.home() / "kambas-private-backups/media-optimization")
    parser.add_argument("--max-total-mb", type=int, default=500, help="Maximum total source size in a new plan (default 500 MiB).")
    parser.add_argument("--apply", type=Path, metavar="PLAN_DIRECTORY", help="Explicitly apply an existing private plan.")
    parser.add_argument("--owner-uid", default="", help="Firebase owner UID used only for new public object paths.")
    args = parser.parse_args()
    try:
        repo = args.repo.expanduser().resolve()
        if args.apply:
            directory = args.apply.expanduser().resolve(strict=True)
            with (directory / ".apply.lock").open("a") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                report = apply_plan(repo, directory, args.owner_uid)
        else:
            if args.max_total_mb <= 0:
                raise ValueError("--max-total-mb must be positive.")
            report = make_plan(repo, args.backup_root.expanduser().resolve(), args.max_total_mb * 1024 * 1024)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        if report.get("mode") == "apply":
            incomplete = {"failed_no_document_change", "conflict_before_processing", "deleted_since_plan", "concurrent_edit_skipped", "patch_failed_or_uncertain", "source_changed_or_access_revoked", "verification_failed"}
            if any(value in incomplete for value in report["documents"].values()) or any(value["status"] in incomplete for value in report["sources"].values()):
                return 2
        return 0
    except (ValueError, RuntimeError, OSError, KeyError, subprocess.SubprocessError) as cause:
        # Exception messages can contain filenames or remote URLs. Keep stdout
        # credential-free; private backups/state remain available for review.
        detail = str(cause) if isinstance(cause, (ValueError, RuntimeError)) else type(cause).__name__
        if "://" in detail or "Bearer " in detail or len(detail) > 300:
            detail = type(cause).__name__
        print(json.dumps({"status": "stopped", "reason": detail, "originals_retained": True}))
        return 1
    except KeyboardInterrupt:
        print(json.dumps({"status": "cancelled", "originals_retained": True}))
        return 130


if __name__ == "__main__":
    sys.exit(main())
