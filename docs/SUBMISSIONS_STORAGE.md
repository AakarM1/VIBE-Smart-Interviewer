# Submissions & Media Storage

This document explains where test submissions and their media are stored across environments and how to access them.

## Overview
- Business data is stored in the database tables `submissions` and `media_files`.
- Uploaded media (video/audio) is stored via a pluggable provider: Local disk, AWS S3, or Firebase Storage.
- Provider is selected with the environment variable `STORAGE_PROVIDER`.

## Database Records

### Table: `submissions`
Key columns (see `backend/app/models.py`):
- `id` (UUID): Submission ID
- `user_id`, `tenant_id` (UUID): Owner and tenant
- `test_type`: `JDT` or `SJT`
- `candidate_name`, `candidate_id`, `candidate_language`, `ui_language`
- `conversation_history` (JSON): Full conversation data captured client-side
- `analysis_result` (JSON): Final analysis; may be null until completed
- `total_questions`, `base_questions`, `follow_up_questions` (Ints)
- `test_configuration` (JSON): Snapshot of config used
- `status`: `submitted | analyzing | completed | failed`
- Timestamps: `created_at`, `updated_at`, `analysis_completed_at`

### Table: `media_files`
Key columns:
- `id` (UUID), `submission_id` (FK)
- `file_name`, `file_path`, `file_type` (`video | audio`), `mime_type`, `file_size`
- `question_index` (int), `scenario_id` (string), `is_follow_up` (bool), `follow_up_sequence` (int)
- `storage_provider` (`local | s3 | firebase`)
- `storage_url` (public/relative URL), `firebase_path` (bucket path when using Firebase)
- `transcription_status`, `transcription_text`

These two tables connect business data to the stored media.

## Storage Providers & Paths
Implementation: `backend/app/storage.py` (class `MediaStorageManager`).

Set via env var `STORAGE_PROVIDER`:
- `local`: Files saved under `STORAGE_PATH` (default `./uploads`).
  - Layout: `uploads/submissions/<submission_id>/Q<index+1>_<video|audio>.<ext>`
  - Example: `uploads/submissions/6a...e2/Q1_video.webm`
  - Served by FastAPI under `/media` (only when `STORAGE_PROVIDER=local`).
- `s3`: Uses `boto3` to upload to your bucket.
  - Required env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_REGION`.
  - `storage_url` looks like `https://<bucket>.s3.<region>.amazonaws.com/<key>`.
- `firebase` (default): Uses `app/firebase_storage.py` helper if available.
  - Env: `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` (service account JSON).
  - Organized path includes tenant, user, submission, scenario, question, follow-up.
  - `storage_url` is returned from Firebase (public URL), and `firebase_path` stores the bucket path.

Notes:
- If Firebase helper is unavailable, the manager falls back to local storage.
- For local dev on Windows, paths are relative to the backend working directory unless `STORAGE_PATH` is absolute.

## Serving & Accessing Media
- Local provider only: FastAPI mounts the directory at `/media` in `backend/main.py` when `STORAGE_PROVIDER=local`.
  - Example URL: `http://127.0.0.1:8000/media/submissions/<submission_id>/Q1_video.webm`
- S3 and Firebase: `storage_url` is a full URL to the object (public or pre-signed depending on provider).

## Upload Flow (API)
Endpoint: `POST /api/v1/submissions/{submission_id}/media`
- Multipart form fields:
  - `file` (UploadFile)
  - `question_index` (int)
  - `file_type` (`video | audio`)
  - Optional: `scenario_id` (string), `is_follow_up` (bool), `follow_up_sequence` (int)
- Auth: Candidate can upload only to their own submission; admin/superadmin per tenant rules.
- Response contains: `media_file_id`, `file_path`, `storage_url`, `firebase_path` (if any), `file_size`.

See implementation in `backend/app/api/submissions.py` using `upload_media_file(...)` from the storage manager.

## Quick Local Setup Tips
- For local disk storage, set:
  - `STORAGE_PROVIDER=local`
  - `STORAGE_PATH=./uploads` (or an absolute path like `C:\\path\\to\\uploads` on Windows)
- Ensure the app has permission to write to the path. The manager will create `submissions/` and `temp/` folders.

## Where to Look on Disk
- Local dev default: `./uploads/submissions` relative to the backend process working dir.
- In this repo, a top-level `uploads/submissions/` folder may also be present when running from root with `STORAGE_PATH` pointing there.

## Related Models & Code
- SQLAlchemy models: `backend/app/models.py` (`Submission`, `MediaFile`)
- Storage system: `backend/app/storage.py`
- Upload API: `backend/app/api/submissions.py` (`/{submission_id}/media`)
- Static mount: `backend/main.py` (`/media`)
