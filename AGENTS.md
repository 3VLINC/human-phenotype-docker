# AGENTS.md

## Cursor Cloud specific instructions

This repository is the **Human Phenotype Ontology (HPO)** — a biomedical ontology project, not a traditional software application. All build/test/QC tooling runs inside the `obolibrary/odkfull:v1.6` Docker image.

### Running ontology tools (ROBOT, make, etc.)

Docker must be running before invoking any ontology commands. Start the daemon with:

```
sudo dockerd &>/tmp/dockerd.log &
```

The `src/ontology/run.sh` wrapper uses `-ti` which may fail in non-TTY environments. Instead, invoke Docker directly:

```bash
cd src/ontology
sudo docker run \
  -v "$PWD/../../:/work" \
  -w /work/src/ontology \
  -e ROBOT_JAVA_ARGS="-Xmx6G" \
  -e JAVA_OPTS="-Xmx6G" \
  --user 0:0 \
  --rm obolibrary/odkfull:v1.6 \
  make <TARGET> IMP=false PAT=false
```

Using `--user 0:0` is required in the Cloud Agent VM to avoid permission errors when the container writes files to the mounted volume.

### Key make targets

| Target | Description |
|--------|-------------|
| `make IMP=false PAT=false qc` | Full QC pipeline (includes `test`, builds `hp.owl`, `hp.obo`, runs SPARQL checks and HPO QC jar) |
| `make IMP=false PAT=false test` | Runs `sparql_test`, `test_obo`, `hp_error`, `consistency`, `noequivalents`, `fastobo` |

The `qc` target is the CI-equivalent check (see `.github/workflows/qc.yml`). The `IMP=false PAT=false` flags skip import refresh and pattern regeneration, which require network access and are not needed for local QC.

### Documentation site (MkDocs)

The docs site uses MkDocs with Material theme. After `pip install mkdocs-material`:

```
cd /workspace && mkdocs serve -a 0.0.0.0:8000
```

Serves on port 8000 at `/human-phenotype-ontology/`.

### Important notes

- The main ontology source file is `src/ontology/hp-edit.owl` (~32 MB OWL Functional Syntax).
- ROBOT and Java-based tools need at least `-Xmx6G` heap; 8G is recommended.
- The `qc` target takes ~2-3 minutes to run.
- Build artifacts (`hp.owl`, `hp.obo`, `hp-simple-non-classified.owl`, etc.) are generated into `src/ontology/` but should not be committed during development — they are release artifacts.
- After running QC, reset generated files with `git checkout -- . && git clean -fd` in the repo root.
