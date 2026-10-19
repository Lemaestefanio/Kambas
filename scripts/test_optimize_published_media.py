#!/usr/bin/env python3
"""Offline regression tests for published-media updates and restart safety.

Run: python3 scripts/test_optimize_published_media.py
All API, upload and encoder entry points are replaced; no credentials, network,
ffmpeg, third-party dependencies or real project data are used.
"""

import copy
import hashlib
import io
import json
from pathlib import Path
import runpy
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit


def sha256(value):
    return hashlib.sha256(value).hexdigest()


class PublishedMediaApplyTests(unittest.TestCase):
    def setUp(self):
        loaded = runpy.run_path(
            str(Path(__file__).with_name("optimize-published-media.py")),
            run_name="offline_test",
        )
        self.module = loaded["apply_plan"].__globals__
        self.temporary = tempfile.TemporaryDirectory(prefix="kambas-offline-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.directory = self.root / "private"
        self.media = self.directory / "media"
        (self.repo / "public/assets").mkdir(parents=True)
        self.media.mkdir(parents=True)

        self.cfg = {
            "project": "offline-test-project",
            "database": "offline-test-database",
            "bucket": "offline-test.firebasestorage.app",
        }
        self.uid = "offline-test-admin"
        self.name = (
            f"projects/{self.cfg['project']}/databases/{self.cfg['database']}"
            "/documents/creators/test"
        )
        self.before_time = "2026-10-19T10:00:00Z"
        self.after_time = "2026-10-19T11:00:00Z"
        self.base = {
            "name": self.name,
            "updateTime": self.before_time,
            "fields": {
                "bannerVideo": {"stringValue": "/assets/source.mp4"},
                "bio": {"stringValue": "Unchanged metadata"},
                "createdAt": {"timestampValue": self.before_time},
                "posts": {"arrayValue": {"values": []}},
            },
        }
        self.current = copy.deepcopy(self.base)
        self.original_bytes = b"original-test-bytes"
        self.candidate_bytes = b"small"
        self.source_path = self.repo / "public/assets/source.mp4"
        self.source_path.write_bytes(self.original_bytes)
        (self.repo / "firebase-applet-config.json").write_text(json.dumps({
            "projectId": self.cfg["project"],
            "firestoreDatabaseId": self.cfg["database"],
            "storageBucket": self.cfg["bucket"],
        }))
        locator = {"kind": "repo", "relative_path": "public/assets/source.mp4"}
        self.key = self.module["source_key"](locator)
        source = {
            **locator,
            "bytes": len(self.original_bytes),
            "sha256": sha256(self.original_bytes),
        }
        self.backup_path = self.directory / "original-documents.json"
        self.backup_path.write_text(json.dumps([self.base]))
        self.backup_hash = self.module["digest_file"](self.backup_path)
        plan = {
            "version": self.module["VERSION"],
            "config": self.cfg,
            "backup_sha256": self.backup_hash,
            "documents": [{
                "name": self.name,
                "updateTime": self.before_time,
                "references": [{"path": ["bannerVideo"], "source": self.key}],
            }],
            "sources": {self.key: source},
        }
        (self.directory / "manifest.json").write_text(json.dumps(plan))
        saved_source = {
            "status": "uploaded",
            "object": f"public/{self.uid}/new.mp4",
            "token": "offline-test-token",
            "candidate_sha256": sha256(self.candidate_bytes),
            "original_sha256": sha256(self.original_bytes),
        }
        self.state_path = self.directory / "apply-state.json"
        self.state_path.write_text(json.dumps({
            "owner_uid": self.uid,
            "sources": {self.key: saved_source},
            "documents": {},
        }))
        self.original = self.media / f"{self.key}-original.mp4"
        self.candidate = self.media / f"{self.key}-optimized.mp4"
        self.original.write_bytes(self.original_bytes)
        self.candidate.write_bytes(self.candidate_bytes)
        self.calls = {"upload": 0, "patch": 0}
        self.fail_patch_for_concurrent_edit = False
        self.storage_source_url = None
        self.public_checks = 0
        self.reject_public_check_at = None
        test = self

        class FakeAPI:
            def __init__(self, project):
                test.assertEqual(project, test.cfg["project"])

            def open(self, *args, **kwargs):
                if not test.storage_source_url or args != (test.storage_source_url,):
                    raise AssertionError("Unexpected HTTP-style call in offline test")
                test.assertTrue(kwargs.get("public"), "Original access must be checked without OAuth")
                test.assertEqual(kwargs.get("headers"), {"Range": "bytes=0-31"})
                test.public_checks += 1
                if test.reject_public_check_at and test.public_checks >= test.reject_public_check_at:
                    raise test.module["RemoteError"](403, "PERMISSION_DENIED")
                return io.BytesIO(test.original_bytes)

            def json(self, url, method="GET", value=None):
                if test.storage_source_url and url == test.module["object_url"](
                    test.cfg["bucket"], f"public/{test.uid}/source.mp4"
                ):
                    test.assertEqual(method, "GET")
                    return {"generation": "1", "size": str(len(test.original_bytes))}
                test.assertTrue(url.startswith(
                    "https://firestore.googleapis.com/v1/" + test.name
                ))
                if method == "GET":
                    return copy.deepcopy(test.current)
                test.assertEqual(method, "PATCH")
                test.calls["patch"] += 1
                query = parse_qs(urlsplit(url).query)
                test.assertEqual(
                    set(query["updateMask.fieldPaths"]),
                    {"bannerVideo", "updatedAt"},
                )
                test.assertEqual(
                    query["currentDocument.updateTime"], [test.before_time]
                )
                test.assertEqual(set(value["fields"]), {"bannerVideo", "updatedAt"})
                if test.fail_patch_for_concurrent_edit:
                    raise test.module["RemoteError"](412, "FAILED_PRECONDITION")
                test.current["fields"].update(copy.deepcopy(value["fields"]))
                test.current["updateTime"] = test.after_time
                return copy.deepcopy(test.current)

        def fake_upload(api, cfg, path, saved, key, owner):
            self.calls["upload"] += 1
            self.assertEqual(path.read_bytes(), self.candidate_bytes)
            self.assertEqual(owner, self.uid)
            self.assertEqual(key, self.key)
            return {
                **saved,
                "status": "uploaded",
                "bytes": len(self.candidate_bytes),
                "generation": "9",
            }

        def unexpected_processing(*args, **kwargs):
            raise AssertionError("Offline resume fixture must not download or encode")

        self.module.update({
            "API": FakeAPI,
            "upload": fake_upload,
            "encode": unexpected_processing,
            "download_source": unexpected_processing,
        })

    def apply(self):
        return self.module["apply_plan"](self.repo, self.directory, self.uid)

    def assert_originals_retained(self):
        self.assertEqual(self.source_path.read_bytes(), self.original_bytes)
        self.assertEqual(self.original.read_bytes(), self.original_bytes)
        self.assertEqual(self.module["digest_file"](self.backup_path), self.backup_hash)

    def use_bucket_source(self):
        source_object = f"public/{self.uid}/source.mp4"
        self.storage_source_url = self.module["public_url"](
            self.cfg["bucket"], source_object, "original-test-token"
        )
        self.base["fields"]["bannerVideo"] = {"stringValue": self.storage_source_url}
        self.current = copy.deepcopy(self.base)
        self.backup_path.write_text(json.dumps([self.base]))
        self.backup_hash = self.module["digest_file"](self.backup_path)
        plan_path = self.directory / "manifest.json"
        plan = json.loads(plan_path.read_text())
        plan["backup_sha256"] = self.backup_hash
        plan["sources"][self.key] = {
            "kind": "bucket", "object": source_object, "generation": "1",
            "bytes": len(self.original_bytes),
        }
        plan_path.write_text(json.dumps(plan))

    def test_stale_uploaded_state_cannot_patch_when_candidate_verification_fails(self):
        self.candidate.unlink()
        report = self.apply()
        self.assertEqual(self.calls, {"upload": 0, "patch": 0})
        self.assertEqual(report["sources"][self.key[:12]]["status"], "failed_no_document_change")
        self.assertEqual(report["documents"]["test"], "no_smaller_verified_media")
        self.assertEqual(self.current, self.base)
        self.assert_originals_retained()

    def test_changed_document_is_skipped_before_any_upload(self):
        self.current["updateTime"] = self.after_time
        self.current["fields"]["bio"] = {"stringValue": "New administrator edit"}
        expected = copy.deepcopy(self.current)
        report = self.apply()
        self.assertEqual(report["documents"]["test"], "conflict_before_processing")
        self.assertEqual(self.calls, {"upload": 0, "patch": 0})
        self.assertEqual(self.current, expected)
        self.assert_originals_retained()

    def test_edit_between_preflight_and_patch_is_rejected_by_update_time(self):
        self.fail_patch_for_concurrent_edit = True
        report = self.apply()
        self.assertEqual(report["documents"]["test"], "concurrent_edit_skipped")
        self.assertEqual(self.calls, {"upload": 1, "patch": 1})
        self.assertEqual(self.current, self.base)
        self.assert_originals_retained()

    def test_verified_patch_preserves_unrelated_fields_and_originals(self):
        report = self.apply()
        self.assertEqual(report["documents"]["test"], "verified")
        self.assertEqual(self.calls, {"upload": 1, "patch": 1})
        self.assertNotEqual(self.current["fields"]["bannerVideo"], self.base["fields"]["bannerVideo"])
        for field in ("bio", "createdAt", "posts"):
            self.assertEqual(self.current["fields"][field], self.base["fields"][field])
        self.assert_originals_retained()

    def test_pending_patch_is_reconciled_on_resume_without_repeating_writes(self):
        self.apply()
        state = json.loads(self.state_path.read_text())
        state["documents"][self.name]["status"] = "patch_pending"
        self.state_path.write_text(json.dumps(state))
        self.candidate.unlink()
        self.calls = {"upload": 0, "patch": 0}
        report = self.apply()
        self.assertEqual(report["documents"]["test"], "verified_on_resume")
        self.assertEqual(self.calls, {"upload": 0, "patch": 0})
        state = json.loads(self.state_path.read_text())
        self.assertEqual(state["documents"][self.name]["status"], "verified")
        self.assert_originals_retained()

    def test_revoked_source_is_rejected_before_processing(self):
        self.use_bucket_source()
        self.reject_public_check_at = 1
        report = self.apply()
        self.assertEqual(report["documents"]["test"], "source_changed_or_access_revoked")
        self.assertEqual(self.calls, {"upload": 0, "patch": 0})
        self.assertEqual(self.public_checks, 1)
        self.assertEqual(self.current, self.base)
        self.assert_originals_retained()

    def test_source_revoked_after_preflight_never_gets_a_new_public_upload(self):
        self.use_bucket_source()
        self.reject_public_check_at = 2
        report = self.apply()
        self.assertEqual(report["sources"][self.key[:12]]["status"], "failed_no_document_change")
        self.assertEqual(report["documents"]["test"], "no_smaller_verified_media")
        self.assertEqual(self.calls, {"upload": 0, "patch": 0})
        self.assertEqual(self.public_checks, 2)
        self.assertEqual(self.current, self.base)
        self.assert_originals_retained()


if __name__ == "__main__":
    unittest.main()
