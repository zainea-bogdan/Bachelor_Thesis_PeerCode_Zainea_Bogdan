class StructureMetricsService:

    def validate_repo_structure(
        self,
        tree: list,
        expected_structure: dict,
        repo_name: str,
    ) -> dict:

        # build lookup of actual repo contents
        actual_blobs = {}
        for entry in tree:
            if entry.get("type") == "blob":
                actual_blobs[entry.get("path")] = entry.get("size", 0)

        results = []
        for expected_path, description in expected_structure.items():
            is_directory = expected_path.endswith("/")

            if is_directory:
                dir_path = expected_path.rstrip("/")
                files_inside = []
                for blob_path, blob_size in actual_blobs.items():
                    if blob_path.startswith(dir_path + "/"):
                        files_inside.append((blob_path, blob_size))

                if len(files_inside) == 0:
                    status = "missing"
                elif all(size == 0 for _, size in files_inside):
                    status = "placeholder"
                else:
                    status = "present"
            else:
                if expected_path not in actual_blobs:
                    status = "missing"
                elif actual_blobs[expected_path] == 0:
                    status = "placeholder"
                else:
                    status = "present"

            result = {
                "path": expected_path,
                "type": "directory" if is_directory else "file",
                "status": status,
                "description": description,
            }
            results.append(result)

        total_required = len(results)
        present_count = 0
        missing_count = 0
        placeholder_count = 0
        for r in results:
            if r["status"] == "present":
                present_count += 1
            elif r["status"] == "missing":
                missing_count += 1
            elif r["status"] == "placeholder":
                placeholder_count += 1

        compliance_ratio = round(present_count / total_required, 4) if total_required > 0 else 0

        flags = []
        missing_paths = []
        placeholder_paths = []
        for r in results:
            if r["status"] == "missing":
                missing_paths.append(r["path"])
            elif r["status"] == "placeholder":
                placeholder_paths.append(r["path"])

        if missing_paths:
            flags.append({
                "name": "MISSING_REQUIRED_PATHS",
                "type": "warning",
                "description": f"{len(missing_paths)} required path(s) are absent from the repo: {', '.join(missing_paths)}"
            })

        if placeholder_paths:
            flags.append({
                "name": "PLACEHOLDER_PATHS_DETECTED",
                "type": "warning",
                "description": f"{len(placeholder_paths)} path(s) exist but contain no content: {', '.join(placeholder_paths)}"
            })

        return {
            "status": "success",
            "structure_validation": {
                "repo": repo_name,
                "category": "structure_validation",
                "total_required": total_required,
                "present_count": present_count,
                "missing_count": missing_count,
                "placeholder_count": placeholder_count,
                "compliance_ratio": compliance_ratio,
                "results": results,
                "flags": flags,
            }
        }
